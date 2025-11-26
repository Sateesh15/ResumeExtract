import axios from "axios";

// Function to extract token from URL and store it securely
function handleTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const token = urlParams.get("code");

  if (token) {
    // Store the token in localStorage
    localStorage.setItem("authToken", token);

    // Clean up the URL
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// Call the function to handle the token
handleTokenFromUrl();

// Create an Axios instance with token attached
const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;