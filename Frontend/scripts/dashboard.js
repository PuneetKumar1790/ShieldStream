class Dashboard {
  static async loadUserData() {
    try {
      const user = await Auth.getCurrentUser();
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      document.getElementById("userName").textContent = user.username;
      document.getElementById("welcomeName").textContent = user.username;

      // Load user's videos
      await this.loadUserVideos();
    } catch (error) {
      console.error("Error loading dashboard:", error);
      window.location.href = "login.html";
    }
  }

  static async loadUserVideos() {
    // This would call your backend API to get user's videos
    // For now, we'll use demo data
    const videos = [
      { id: "social", name: "Algebra - Lecture 01", status: "secure" },
      {
        id: "chemistry",
        name: "Organic Chemistry - Intro",
        status: "processing",
      },
      { id: "physics", name: "Physics - Kinematics", status: "secure" },
    ];

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    videos.forEach((video) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
                <td class="px-5 py-3">
                    <img src="/placeholder.svg?height=56&width=100" alt="thumbnail" 
                         class="w-24 h-14 rounded-lg object-cover">
                </td>
                <td class="px-5 py-3 font-medium text-gray-900">${
                  video.name
                }</td>
                <td class="px-5 py-3">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                      video.status === "secure"
                        ? "bg-green-50 text-emerald-700"
                        : "bg-yellow-50 text-amber-700"
                    }">
                        <i class="fa-solid ${
                          video.status === "secure"
                            ? "fa-shield-halved"
                            : "fa-rotate"
                        }"></i> 
                        ${video.status === "secure" ? "Secure" : "Processing"}
                    </span>
                </td>
                <td class="px-5 py-3">
                    <div class="flex items-center gap-3 ${
                      video.status !== "secure" ? "opacity-60" : ""
                    }">
                        ${
                          video.status === "secure"
                            ? `<a href="player.html?id=${video.id}" class="text-primary hover:underline">Play</a>
                             <button class="copy-link text-gray-600 hover:text-gray-900" 
                                     data-url="player.html?id=${video.id}">Copy Link</button>`
                            : `<span>Play</span><span>Copy Link</span>`
                        }
                    </div>
                </td>
            `;
      tbody.appendChild(row);
    });

    // Add copy link functionality
    document.querySelectorAll(".copy-link").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const url = location.origin + "/" + btn.dataset.url;
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard");
      });
    });
  }
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", async () => {
  await Dashboard.loadUserData();
});
