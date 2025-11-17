// Handle browser back button and custom exit logic
window.addEventListener("popstate", (event) => {
  // Prevent going back immediately
  showExitOverlay();
  history.pushState(null, "", location.href);
});

function showExitOverlay() {
  const overlay = document.getElementById("exitOverlay");
  overlay.classList.add("active");
}

function hideExitOverlay() {
  const overlay = document.getElementById("exitOverlay");
  overlay.classList.remove("active");
}

// Keep the user on this page
history.pushState(null, "", location.href);

// Button actions
document.getElementById("exitCancelBtn").addEventListener("click", () => {
  hideExitOverlay();
});

document.getElementById("exitConfirmBtn").addEventListener("click", () => {
  window.history.back(); // actually navigate back now
});
