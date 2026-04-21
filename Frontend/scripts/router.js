// Router and utility functions for ShieldStream

export function showToast(message, type = "success") {
  // Create toast if it doesn't exist
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className =
      "fixed bottom-6 right-6 z-50 bg-white text-gray-800 border border-gray-200 shadow-lg px-4 py-3 rounded-lg hidden";
    document.body.appendChild(toast);
  }

  const iconClass =
    type === "success"
      ? "fa-check-circle text-green-500"
      : "fa-exclamation-circle text-red-500";

  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas ${iconClass}"></i>
      <span>${message}</span>
    </div>
  `;

  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, 3000);
}

export function highlightNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll("[data-nav]");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("bg-blue-50", "text-blue-800");
      link.classList.remove("hover:bg-blue-50", "hover:text-blue-800");
    }
  });
}

export function initCounters() {
  const counters = document.querySelectorAll("[data-counter]");

  const observerOptions = {
    threshold: 0.5,
    rootMargin: "0px 0px -100px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.dataset.target);
        const suffix = counter.dataset.suffix || "";
        let current = 0;

        const increment = target / 50;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          counter.textContent = Math.floor(current);
        }, 30);

        observer.unobserve(counter);
      }
    });
  }, observerOptions);

  counters.forEach((counter) => observer.observe(counter));
}

export function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

// Utility function to get URL parameters
export function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Utility function to format time
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
