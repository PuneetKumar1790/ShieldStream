// config.js

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const isLiveServer = window.location.port === "5500" || window.location.port === "5501";
const isVercelDeployment =
  window.location.hostname === "hack-odisha-5-0.vercel.app";

let BASE_URL;

if (isLocalhost) {
  // For localhost development
  if (isLiveServer) {
    // When using Live Server (port 5500), backend runs on port 5000
    BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
  } else {
    // When served directly by backend
    BASE_URL = window.location.origin;
  }
} else if (isVercelDeployment) {
  // For Vercel deployment, use the deployed backend
  BASE_URL = "https://shieldstream.onrender.com";
} else {
  // Fallback for other deployments
  BASE_URL = "https://shieldstream.onrender.com";
}

// Debug information (remove in production)
console.log("Environment Detection:", {
  hostname: window.location.hostname,
  port: window.location.port,
  protocol: window.location.protocol,
  isLocalhost,
  isLiveServer,
  isVercelDeployment,
  BASE_URL,
});

export { BASE_URL };
