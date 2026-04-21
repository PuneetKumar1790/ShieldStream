import { BASE_URL } from "../config.js";
import { Auth } from "./auth.js";

class SecurePlayer {
  static async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("id") || "social";
    const isDemo = urlParams.get("demo") === "true";

    // Show loading state
    this.showLoading();

    // Start countdown timer
    this.startCountdown();

    // Initialize video player
    try {
      if (isDemo) {
        // For demo, show a placeholder
        this.initDemoPlayer();
      } else {
        await this.initVideoPlayer(videoId);
      }
    } catch (error) {
      console.error("Player initialization error:", error);
      this.showError("Failed to initialize video player. Please try again.");
    }
  }

  static showLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden");
    }
  }

  static hideLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden");
    }
  }

  static showError(message) {
    this.hideLoading();
    const errorOverlay = document.getElementById("error-overlay");
    const errorMessage = document.getElementById("error-message");
    if (errorOverlay && errorMessage) {
      errorMessage.textContent = message;
      errorOverlay.classList.remove("hidden");
    }
  }

  static hideError() {
    const errorOverlay = document.getElementById("error-overlay");
    if (errorOverlay) {
      errorOverlay.classList.add("hidden");
    }
  }

  static startCountdown() {
    let timeLeft = 600; // 10 minutes in seconds
    const countdownElement = document.getElementById("countdown");

    // Only start countdown if the element exists
    if (!countdownElement) {
      console.log("Countdown element not found, skipping countdown timer");
      return;
    }

    const timer = setInterval(() => {
      timeLeft--;

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      countdownElement.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

      if (timeLeft <= 30) {
        countdownElement.classList.add("timer-urgent");
      }

      if (timeLeft <= 0) {
        clearInterval(timer);
        const expiryOverlay = document.getElementById("expiry-overlay");
        if (expiryOverlay) {
          expiryOverlay.classList.remove("hidden");
        }
        // Pause video if it's playing
        const video = document.getElementById("video");
        if (video) {
          video.pause();
        }
      }
    }, 1000);
  }

  static initDemoPlayer() {
    this.hideLoading();
    const video = document.getElementById("video");
    video.src =
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    video.poster =
      "https://interactive-examples.mdn.mozilla.net/media/examples/flower.jpg";
    
    // Add error handling for demo video
    video.addEventListener('error', () => {
      this.showError("Failed to load demo video. Please check your internet connection.");
    });
  }

  static async initVideoPlayer(videoId) {
    try {
      console.log(`Loading stream for video ID: ${videoId}`);

      const fetchStream = () =>
        fetch(`${BASE_URL}/api/stream/${videoId}`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/vnd.apple.mpegurl,*/*",
          },
        });

      let response = await fetchStream();

      if (response.status === 401) {
        // Try refreshing once if the access cookie has expired.
        const tokenRefreshed = await Auth.refreshToken();
        if (!tokenRefreshed) {
          this.showError("Authentication failed. Please login again.");
          return;
        }

        response = await fetchStream();
      }

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        console.log("Authentication failed, redirecting to login");
        this.showError("Session expired. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "index.html#login-required";
        }, 2000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Stream response error:", errorData);
        this.showError(`Failed to load stream (${response.status}). Please try again.`);
        return;
      }

      const m3u8Content = await response.text();
      console.log(
        "M3U8 Content received:",
        m3u8Content.substring(0, 200) + "..."
      );

      // Check if this is demo content (no encryption)
      if (m3u8Content.includes("demo.unified-streaming.com") || 
          m3u8Content.includes("BigBuckBunny.mp4")) {
        console.warn("Detected demo content in secure player path; blocking demo fallback.");
        this.showError("Secure stream is not configured for demo playback. Please use the Azure stream.");
        return;
      }

      const video = document.getElementById("video");

      if (Hls.isSupported()) {
        console.log("Using HLS.js for playback");
        const hls = new Hls({
          debug: false, // Disable debug in production
          xhrSetup: function (xhr, url) {
            // Include credentials for all backend requests
            xhr.withCredentials = true;
          },
        });

        // Create blob URL for the playlist
        const blob = new Blob([m3u8Content], {
          type: "application/vnd.apple.mpegurl",
        });
        const playlistUrl = URL.createObjectURL(blob);

        hls.loadSource(playlistUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("Manifest parsed, ready to play");
          this.hideLoading();
          this.hideError();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS Error:", event, data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error, trying to recover...");
                this.showError("Network error. Attempting to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error, trying to recover...");
                this.showError("Secure stream codec error. Please use a browser with HLS support.");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal error, destroying HLS instance");
                this.showError("Fatal secure playback error. Please try again.");
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("Using native HLS support");
        const blob = new Blob([m3u8Content], {
          type: "application/vnd.apple.mpegurl",
        });
        video.src = URL.createObjectURL(blob);
        this.hideLoading();
        this.hideError();
      } else {
        this.showError("HLS is not supported in this browser. Please use a modern browser.");
        return;
      }
    } catch (error) {
      console.error("Error initializing video player:", error);
      this.showError(`Failed to initialize video player: ${error.message}`);
    }
  }
}

// Initialize player when page loads
document.addEventListener("DOMContentLoaded", () => {
  SecurePlayer.init();

  // Add retry functionality
  document.getElementById("retry-btn")?.addEventListener("click", () => {
    SecurePlayer.hideError();
    SecurePlayer.init();
  });

  // Add copy link functionality
  document.getElementById("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Show success message
      const btn = document.getElementById("copy-link");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      btn.classList.add("text-green-600");

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove("text-green-600");
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copied to clipboard");
    }
  });
});
