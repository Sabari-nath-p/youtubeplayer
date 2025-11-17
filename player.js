document.addEventListener('DOMContentLoaded', async () => {

/* === Load Exit Alert Box === */
async function loadAlertBox() {
  try {
    const response = await fetch("alert.html");
    const html = await response.text();
    document.body.insertAdjacentHTML("beforeend", html);
    console.log("Alert box loaded successfully.");

    // Load blob animation only after alert.html is in DOM
    const script = document.createElement("script");
    script.src = "js/blobs.js";
    script.onload = () => console.log("Blob animation loaded!");
    document.body.appendChild(script);

    setupExitAlert();
  } catch (error) {
    console.error("Failed to load alert.html:", error);
  }
}

function hideNetworkOverlay() {
  const overlay = document.getElementById("networkOverlay");
  if (!overlay) return;
  overlay.style.opacity = "0";
  setTimeout(() => (overlay.style.display = "none"), 300);
}

// Retry Button
document.addEventListener("click", (e) => {
  if (e.target.id === "retryBtn") {
    if (navigator.onLine) {
      hideNetworkOverlay();
    } else {
      alert("⚠️ Still offline. Please check your internet connection.");
    }
  }
});

// === NETWORK HANDLING (Redirect to No Internet Page) ===
window.addEventListener("offline", () => {
  console.warn("🚨 No Internet connection detected — redirecting...");
  window.location.href = "nointernet.html";
});


window.addEventListener("online", () => {
  console.log("Internet connection restored");
  hideNetworkOverlay();
});

// === SERVER FAILURE HANDLING ===
function handleServerFailure(reason = "Unknown error") {
  console.error(`Server failure detected: ${reason}`);
  // Prevent infinite redirects
  if (!window.location.href.includes("serverfail.html")) {
    window.location.href = "serverfail.html";
  }
}

/* === Setup Buttons & Key Handling === */
function setupExitAlert() {
  const yesBtn = document.getElementById("exitYesBtn");
  const noBtn = document.getElementById("exitNoBtn");

  if (!yesBtn || !noBtn) {
    console.warn("Exit alert buttons not found.");
    return;
  }

  yesBtn.onclick = () => {
    console.log("Exiting app");
    exitWebOSApp();
  };

  noBtn.onclick = hideExitOverlay;

  window.addEventListener("keydown", (e) => {
    if (e.keyCode === 461 || e.key === "Escape") {
      hideExitOverlay();
    }
  });
}

/* === Remote Button Navigation for Overlay === */
function setupOverlayNavigation() {
  let buttons = [];
  let currentIndex = 0;

  function updateFocus() {
    buttons.forEach((btn, i) => {
      if (i === currentIndex) {
        btn.classList.add("focused");
        btn.focus();
      } else {
        btn.classList.remove("focused");
      }
    });
  }

  // When overlay opens, find the buttons
  function activateOverlayNav() {
    const overlay = document.getElementById("exitOverlay");
    buttons = Array.from(overlay.querySelectorAll(".exit-btn"));
    currentIndex = 0;
    updateFocus();
  }

  // Listen for remote keys
  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("exitOverlay");
    if (overlay.style.display !== "flex") return; // only if overlay visible

    switch (e.keyCode) {
      case 37: // LEFT
      case 38: // UP
        currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        updateFocus();
        e.preventDefault();
        break;

      case 39: // RIGHT
      case 40: // DOWN
        currentIndex = (currentIndex + 1) % buttons.length;
        updateFocus();
        e.preventDefault();
        break;

      case 13: // OK / ENTER
        buttons[currentIndex].click();
        e.preventDefault();
        break;

      default:
        break;
    }
  });

  return { activateOverlayNav };
}

// Initialize overlay navigation
const overlayNav = setupOverlayNavigation();

// Hook into overlay show
const originalShowExitOverlay = showExitOverlay;
showExitOverlay = function() {
  originalShowExitOverlay();
  setTimeout(() => overlayNav.activateOverlayNav(), 100);
};


/* === Show & Hide Overlay === */
function showExitOverlay() {
  const overlay = document.getElementById("exitOverlay");
  if (!overlay) return;

  // ⏸ Pause all videos when showing exit popup
  try {
    const video = document.getElementById("videoPlayer");
    const youtubePlayer = document.getElementById("ytFrame");

    if (video && !video.paused) {
      video.pause();
      console.log("⏸ Video paused for exit overlay.");
    }

    if (youtubePlayer && youtubePlayer.contentWindow) {
      youtubePlayer.contentWindow.postMessage({ type: "pause" }, "*");
      console.log("⏸ YouTube video paused for exit overlay.");
    }
  } catch (err) {
    console.error("Failed to pause videos:", err);
  }

  // Show the overlay
  overlay.style.display = "flex";
  overlay.style.opacity = "1";
  toggleCursor(true);
}


function hideExitOverlay() {
  const overlay = document.getElementById("exitOverlay");
  if (!overlay) return;
  overlay.style.opacity = "0";
  setTimeout(() => (overlay.style.display = "none"), 200);
  toggleCursor(false);

  // ▶️ Resume playback when exit cancelled
  try {
    const video = document.getElementById("videoPlayer");
    const youtubePlayer = document.getElementById("ytFrame");

    if (video && video.src) {
      video.play().catch(() => console.warn("Couldn't auto-resume video."));
    }

    if (youtubePlayer && youtubePlayer.contentWindow) {
      youtubePlayer.contentWindow.postMessage({ type: "play" }, "*");
    }
  } catch (err) {
    console.error("Resume failed:", err);
  }
}


/* === Exit App === */
function exitWebOSApp() {
  try {
    if (typeof webOS !== "undefined" && webOS.platformBack) {
      console.log("Calling webOS.platformBack()");
      webOS.platformBack();
    } else {
      console.log("Using window.close()");
      window.close();
    }
  } catch (err) {
    console.error("Exit failed:", err);
  }
}

/* === Load Alert Box First === */
await loadAlertBox();

/* === Register BACK/EXIT/HOME keys === */
/* === Ensure Remote Keys Are Registered Correctly === */
if (typeof webOS !== "undefined" && webOS.service) {
  console.log("🔑 Registering remote keys on real LG TV...");

  webOS.service.request("luna://com.webos.service.tv.inputdevice", {
    method: "registerRemoteKey",
    parameters: { keys: ["BACK", "EXIT", "HOME"] },
    onSuccess: (res) => console.log("✅ Keys registered successfully:", res),
    onFailure: (err) => console.error("❌ Failed to register keys:", err)
  });
}

/* === Listen for Native webOS Back Events === */
document.addEventListener("webOSBack", (e) => {
  console.log("🔙 webOSBack event detected");
  e.preventDefault();
  e.stopImmediatePropagation();
  showExitOverlay(); // your custom alert box
});

/* === Backup Fallback for Physical BACK Button (keyCode 461) === */
document.addEventListener("keydown", (e) => {
  if (e.keyCode === 461) {
    console.log("🟡 BACK key detected (keyCode 461)");
    e.preventDefault();
    e.stopImmediatePropagation();
    showExitOverlay();
  }
});

/* === Intercept Platform Back Calls (system-level) === */
if (typeof webOSSystem !== "undefined") {
  webOSSystem.onclose = () => {
    console.log("🔒 Intercepted webOSSystem.onclose");
    showExitOverlay();
    return false; // prevent system from closing app
  };
}


/* === Prevent back navigation === */
history.pushState(null, "", location.href);
window.addEventListener("popstate", (event) => {
  history.pushState(null, "", location.href);
  showExitOverlay();
});

/* === Everything else (your video, websocket, etc.) === */
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const bottomScrollText = document.getElementById('bottomScrollText');
const upperScrollText = document.getElementById('upperScrollText');
const video = document.getElementById("videoPlayer");
const imageView = document.getElementById("imageViewer");
const youtubePlayer = document.getElementById('ytFrame');

let currentIndex = -1;
let totalLength = 0;
let campaignData = {};
let contentTimer = null;
let keepAliveInterval = null;

bottomScrollText.style.display = 'none';
upperScrollText.style.display = 'none';
if (imageView) imageView.style.display = 'none';


function loadYoutubeVideo(id) {
    video.style.display = 'none'
    imageView.style.display = 'none'
    youtubePlayer.style.display = 'flex'
    youtubePlayer.contentWindow.postMessage({ type: 'loadVideo', videoId: id }, '*');
    }

/* === Video Handling === */
video.addEventListener("ended", () => {
  console.log("Video ended — loading next one...");
  updateContent();
});

    window.addEventListener('message', (e) => {
      const data = e.data || {};

       if (data.type === 'playerReady') {
    console.log('Player is ready. Checking current content type...');
 
    // 1. Check if we have valid campaign data and a valid index
    if (campaignData?.campaignScrollText?.eventTypes && currentIndex >= 0) {
     
      const currentContent = campaignData.campaignScrollText.eventTypes[currentIndex];
 
      // 2. ONLY load if the current content intended to be shown is a YouTube link
      if (currentContent && currentContent.type === 'link') {
        console.log("Current content matches YouTube. Loading video ID...");
        let videoId = extractYouTubeVideoId(currentContent.link);
       
        if (videoId) {
          loadYoutubeVideo(videoId);
        }
      } else {
        console.log("Player ready, but current content is NOT YouTube (Image/MP4). Skipping load.");
      }
    }
  }


      if (data.type === 'videoEnded') {
        updateContent()
      }
      if (data.type === 'videoError') {
        console.error('YouTube Player Error:', data.error);
        alert('Error playing video. Please try again later.');
      }
    });


function convertDurationToMs(duration) {
  if (!duration) return 0;
  const [hours, minutes, seconds] = duration.split(":").map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function adjustMediaLayout() {
    const upperVisible = upperScrollText && upperScrollText.style.display !== "none";
    const bottomVisible = bottomScrollText && bottomScrollText.style.display !== "none";

    if (upperVisible && bottomVisible) {
      video.style.height = "80%";
      video.style.bottom = "20%";
       youtubePlayer.style.height = "80%";
      youtubePlayer.style.bottom = "20%";
      imageView.style.height = "80%";
      imageView.style.bottom = "20%";
      upperScrollText.style.bottom = "10%";
    } else if (upperVisible || bottomVisible) {
      video.style.height = "90%";
      video.style.bottom = "10%";
       youtubePlayer.style.height = "90%";
      youtubePlayer.style.bottom = "10%";
      imageView.style.height = "90%";
      imageView.style.bottom = "10%";
      upperScrollText.style.bottom = "0%";
    } else {
      video.style.height = "100%";
      video.style.bottom = "0%";
       youtubePlayer.style.height = "100%";
      youtubePlayer.style.bottom = "0%";
      imageView.style.height = "100%";
      imageView.style.bottom = "0%";

      upperScrollText.style.bottom = "10%";
    }

    console.log(`Layout adjusted: upper=${upperVisible}, bottom=${bottomVisible}`);
  }


function setBottomScrollText(bottomText) {
  if (!bottomText) {
    bottomScrollText.style.display = "none";
  } else {
    bottomScrollText.textContent = bottomText;
    bottomScrollText.style.display = "flex";
  }
}

 function setUpperScrollText(upperText) {
  const container = document.getElementById("upperScrollText");
  const content = document.getElementById("upperScrollContent");

  if (!upperText || upperText.trim() === "") {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";
  content.textContent = upperText;

  void container.offsetWidth; 
  
  adjustScrollBehavior(container, content);

 
}

//compare the pixel width of the text and tv width
function adjustScrollBehavior(container, content) {
  const containerWidth = container.offsetWidth;
  const contentWidth = content.scrollWidth;

  // Reset previous animation immediately
  content.style.animation = "none";
  content.style.transform = "translateX(100%)";

  // Force reflow to apply reset before restarting animation
  void content.offsetWidth;

  if (contentWidth > containerWidth) {
    const duration = Math.max(8, contentWidth / 100); // Adjust speed
    content.style.animation = `scroll-left ${duration}s linear infinite`;
    content.style.animationDelay = '-0.1s'; // Starts instantly
    content.style.animationPlayState = 'running';
  } else {
    content.style.animation = "none";
    content.style.transform = "translateX(0)";
  }
}



function setImageContent(imagelink, duration) {
  
    if (contentTimer) clearTimeout(contentTimer);
    if (video) {
      video.style.display = "none";
      video.pause();
      youtubePlayer.style.display = 'none'
    }

    imageView.src = imagelink;
    imageView.style.display = "flex";
    youtubePlayer.contentWindow.postMessage({ type: "pause" }, "*");
    imageView.onload = () => {
      const ratio = imageView.naturalWidth / imageView.naturalHeight;
      if (ratio < 1) {
        imageView.style.objectFit = "contain";
      } else {
        imageView.style.objectFit = "cover";
      }
      imageView.style.backgroundColor = "black";
    };

    const ms = convertDurationToMs(duration);
    contentTimer = setTimeout(updateContent, ms);
  }

 function setVideoContent(videoLink) {
    if (contentTimer) clearTimeout(contentTimer);
    if (imageView) imageView.style.display = "none";

    video.style.display = "block";
    youtubePlayer.style.display = 'none'
    video.src = videoLink;
    youtubePlayer.contentWindow.postMessage({ type: "pause" }, "*");
    video.load();
    video.addEventListener("loadedmetadata", () => {
      const ratio = video.videoWidth / video.videoHeight;
      video.style.objectFit = ratio < 1 ? "contain" : "cover";
      video.style.backgroundColor = "black";
    });

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.log("Video playback started:", videoLink))
        .catch((error) => {
          console.error("Video playback failed:", error);
          updateContent();
        });
    }
  }

function updateCampaign(data) {
  if (contentTimer) clearTimeout(contentTimer);

  setUpperScrollText(data.campaignScrollText.textContent); 
  setBottomScrollText(data.goldRateScrollText);
  adjustMediaLayout();

  campaignData = data;
  currentIndex = -1;
  totalLength = data?.campaignScrollText?.eventTypes?.length || 0;
  updateContent();
}


 function updateContent() {
        if (totalLength > 0){
            currentIndex = currentIndex + 1 
            
            if (currentIndex >= totalLength){
                currentIndex = 0
            }

            let content =  campaignData.campaignScrollText.eventTypes[currentIndex]
           
            if (!content) {
                console.error("No content found at index:", currentIndex);
                return; 
            }
        
        
            if (content.type === 'image'){
                setImageContent(content.link, content.duration)
              
            } else if (content.type === 'video' ||  content.link.includes('mp4')){
                setVideoContent(content.link)
            } else if (content.type == 'link'){
                 let videoId = extractYouTubeVideoId(content.link)
                 loadYoutubeVideo(videoId)
            }
            else {   
                updateCampaign()
            }
        } else {
          
        }
    }


/* === WebSocket Connection === */
if (token && token !== 'Not provided') {
  console.log("Token received:", token);
  const wsUrl = `wss://streaming-websocket-dotnet-master.pixl.ai/ws?access_token=${token}`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send("pong");
    }, 20000);
  };

  socket.onmessage = (event) => {
    try {
      const jsonStart = event.data.indexOf("{");
      const jsonEnd = event.data.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return;
      const jsonString = event.data.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);
      updateCampaign(data);
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  };

 socket.onclose = (event) => {
  console.warn("WebSocket closed unexpectedly", event);
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  handleServerFailure("WebSocket closed");
};
}

/* === Virtual Mouse Cursor Controlled by Remote Keys === */
function setupVirtualCursor() {
  const cursor = document.getElementById("virtualCursor");
  if (!cursor) {
    console.warn("Virtual cursor element not found!");
    return;
  }

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  const step = 60; // pixels moved per key press

  function updateCursor() {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  function simulateClick() {
    const el = document.elementFromPoint(x, y);
    if (el) {
      el.click();
      el.focus();
      console.log("Clicked:", el);
    }
  }

  document.addEventListener("keydown", (e) => {
    switch (e.keyCode) {
      case 37: x = Math.max(0, x - step); break; // LEFT
      case 38: y = Math.max(0, y - step); break; // UP
      case 39: x = Math.min(window.innerWidth, x + step); break; // RIGHT
      case 40: y = Math.min(window.innerHeight, y + step); break; // DOWN
      case 13: simulateClick(); break; // OK / ENTER
      default: return;
    }
    e.preventDefault();
    updateCursor();
  });

  updateCursor();
}

function toggleCursor(show) {
  const cursor = document.getElementById("virtualCursor");
  if (cursor) cursor.style.display = show ? "block" : "none";
}

setupVirtualCursor();

function extractYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);
    let videoId = null;

    if (parsedUrl.hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.slice(1);
    } 
    else if (
      parsedUrl.hostname.includes('youtube.com') ||
      parsedUrl.hostname.includes('youtube-nocookie.com')
    ) {
      if (parsedUrl.searchParams.has('v')) {
        videoId = parsedUrl.searchParams.get('v');
      }
      else if (parsedUrl.pathname.startsWith('/embed/')) {
        videoId = parsedUrl.pathname.split('/embed/')[1].split(/[?&]/)[0];
      }

      else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.split('/shorts/')[1].split(/[?&]/)[0];
      }

      else if (parsedUrl.pathname.startsWith('/live/')) {
        videoId = parsedUrl.pathname.split('/live/')[1].split(/[?&]/)[0];
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    } else {
      return ""; // Invalid or not found
    }
  } catch (e) {
    return ""; // Invalid URL format
  }
}

}); 
