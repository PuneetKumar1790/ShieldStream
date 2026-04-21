import { BASE_URL } from "../config.js";
import { Auth } from "./auth.js";

class SecurePlayer {
  static hls = null;
  static playlistUrl = null;
  static manifestRefreshTimer = null;
  static countdownTimer = null;
  static currentVideoId = null;
  static isRefreshingStream = false;
  static manifestRefreshIntervalMs = 90 * 1000;

  static async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("id") || "social";
    const isDemo = urlParams.get("demo") === "true";

    this.currentVideoId = videoId;
    this.destroyPlayer();

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
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    let timeLeft = 600; // 10 minutes in seconds
    const countdownElement = document.getElementById("countdown");

    // Only start countdown if the element exists
    if (!countdownElement) {
      console.log("Countdown element not found, skipping countdown timer");
      return;
    }

    this.countdownTimer = setInterval(() => {
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
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
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
      await this.loadStream(videoId);
    } catch (error) {
      console.error("Error initializing video player:", error);
      this.showError(`Failed to initialize video player: ${error.message}`);
    }
  }

  static destroyPlayer() {
    if (this.manifestRefreshTimer) {
      clearTimeout(this.manifestRefreshTimer);
      this.manifestRefreshTimer = null;
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.playlistUrl) {
      URL.revokeObjectURL(this.playlistUrl);
      this.playlistUrl = null;
    }
  }

  static async fetchManifest(videoId) {
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
      const tokenRefreshed = await Auth.refreshToken();
      if (!tokenRefreshed) {
        this.showError("Authentication failed. Please login again.");
        return null;
      }

      response = await fetchStream();
    }

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (response.status === 401) {
      console.log("Authentication failed, redirecting to login");
      this.showError("Session expired. Redirecting to login...");
      setTimeout(() => {
        window.location.href = "index.html#login-required";
      }, 2000);
      return null;
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Stream response error:", errorData);
      this.showError(`Failed to load stream (${response.status}). Please try again.`);
      return null;
    }

    const m3u8Content = await response.text();
    console.log(
      "M3U8 Content received:",
      m3u8Content.substring(0, 200) + "..."
    );

    if (
      m3u8Content.includes("demo.unified-streaming.com") ||
      m3u8Content.includes("BigBuckBunny.mp4")
    ) {
      console.warn(
        "Detected demo content in secure player path; blocking demo fallback."
      );
      this.showError(
        "Secure stream is not configured for demo playback. Please use the Azure stream."
      );
      return null;
    }

    return m3u8Content;
  }

  static createPlaylistUrl(m3u8Content) {
    if (this.playlistUrl) {
      URL.revokeObjectURL(this.playlistUrl);
    }

    const blob = new Blob([m3u8Content], {
      type: "application/vnd.apple.mpegurl",
    });
    this.playlistUrl = URL.createObjectURL(blob);
    return this.playlistUrl;
  }

  static scheduleManifestRefresh(videoId) {
    if (this.manifestRefreshTimer) {
      clearTimeout(this.manifestRefreshTimer);
    }

    this.manifestRefreshTimer = setTimeout(() => {
      this.refreshStream(videoId, "scheduled-refresh");
    }, this.manifestRefreshIntervalMs);
  }

  static async loadStream(videoId, options = {}) {
    const {
      resumeTime = null,
      shouldAutoplay = false,
      preserveErrorState = false,
    } = options;

    const m3u8Content = await this.fetchManifest(videoId);
    if (!m3u8Content) {
      return;
    }

    const playlistUrl = this.createPlaylistUrl(m3u8Content);
    const video = document.getElementById("video");

    if (Hls.isSupported()) {
      console.log("Using HLS.js for playback");

      if (this.hls) {
        this.hls.destroy();
      }

      this.hls = new Hls({
        debug: false,
        xhrSetup: function (xhr) {
          xhr.withCredentials = true;
        },
      });

      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        this.hls.loadSource(playlistUrl);
      });

      this.hls.on(Hls.Events.MANIFEST_PARSED, async () => {
        console.log("Manifest parsed, ready to play");

        if (typeof resumeTime === "number" && Number.isFinite(resumeTime)) {
          video.currentTime = resumeTime;
        }

        if (shouldAutoplay) {
          try {
            await video.play();
          } catch (playError) {
            console.warn("Autoplay resume failed:", playError);
          }
        }

        this.hideLoading();
        if (!preserveErrorState) {
          this.hideError();
        }
        this.scheduleManifestRefresh(videoId);
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        this.handleHlsError(videoId, data);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Using native HLS support");
      video.src = playlistUrl;

      if (typeof resumeTime === "number" && Number.isFinite(resumeTime)) {
        video.currentTime = resumeTime;
      }

      if (shouldAutoplay) {
        try {
          await video.play();
        } catch (playError) {
          console.warn("Autoplay resume failed:", playError);
        }
      }

      this.hideLoading();
      if (!preserveErrorState) {
        this.hideError();
      }
      this.scheduleManifestRefresh(videoId);
    } else {
      this.showError(
        "HLS is not supported in this browser. Please use a modern browser."
      );
    }
  }

  static async refreshStream(videoId, reason) {
    if (this.isRefreshingStream) {
      return;
    }

    this.isRefreshingStream = true;
    const video = document.getElementById("video");
    const resumeTime = video ? video.currentTime : 0;
    const shouldAutoplay = video ? !video.paused && !video.ended : false;

    console.log(`Refreshing secure stream because ${reason}`);

    try {
      await this.loadStream(videoId, {
        resumeTime,
        shouldAutoplay,
        preserveErrorState: true,
      });
      this.hideError();
    } finally {
      this.isRefreshingStream = false;
    }
  }

  static handleHlsError(videoId, data) {
    console.error("HLS Error:", data);

    const statusCode = data?.response?.code;
    const isAuthExpiry =
      statusCode === 401 ||
      statusCode === 403 ||
      data?.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
      data?.details === Hls.ErrorDetails.KEY_LOAD_ERROR ||
      data?.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR;

    if (data?.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR && isAuthExpiry) {
      this.showError("Refreshing secure access...");
      this.refreshStream(videoId, `hls-network-${statusCode || "unknown"}`);
      return;
    }

    if (data?.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.log("Network error, trying to recover...");
          this.showError("Network error. Attempting to recover...");
          this.hls?.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.log("Media error, trying to recover...");
          this.showError(
            "Secure stream codec error. Please use a browser with HLS support."
          );
          this.hls?.recoverMediaError();
          break;
        default:
          console.log("Fatal error, destroying HLS instance");
          this.showError("Fatal secure playback error. Please try again.");
          this.destroyPlayer();
          break;
      }
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
