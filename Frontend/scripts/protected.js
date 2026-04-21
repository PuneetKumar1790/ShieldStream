document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await Auth.getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    window.location.href = "index.html";
  }
});
