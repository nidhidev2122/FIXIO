/* File Overview: frontend/js/api.js — api for frontend UI behavior. */
// API utility functions - vanilla JS
const API_BASE = window.location.port === "8000"
  ? "http://127.0.0.1:5000/api"
  : "/api";

const SERVICE_PLACEHOLDER_IMAGES = {
  "ac & appliance repair": "assets/ac&appliance_repair.webp",
  "hair studio for men": "assets/mensalon.webp",
  "salon for women": "assets/salon.avif",
  "cleaning & pest control": "assets/cleaning_icon.avif",
  "electricians": "assets/electrician-tools-logo-18959726.webp",
  "plumbers": "assets/plumber.webp",
};

const SERVICE_IMAGE_ALIASES = {
  "assets/ac-repair.svg": "assets/ac&appliance_repair.webp",
  "assets/hair-men.svg": "assets/mensalon.webp",
  "assets/salon-women.svg": "assets/salon.avif",
  "assets/cleaning-pest.svg": "assets/cleaning_icon.avif",
  "assets/electrician.svg": "assets/electrician-tools-logo-18959726.webp",
  "assets/plumber.svg": "assets/plumber.webp",
};

const SERVICE_CATEGORY_FALLBACK_IMAGES = {
  beauty: "assets/salon.avif",
  cleaning: "assets/cleaning_icon.avif",
  repair: "assets/electrician-tools-logo-18959726.webp",
  general: "assets/hero-service.svg",
};

function getServiceImage(service) {
  if (!service) return "assets/hero-service.svg";

  const raw = String(service.image || "").trim();
  const rawKey = raw.toLowerCase();
  if (rawKey && SERVICE_IMAGE_ALIASES[rawKey]) {
    return SERVICE_IMAGE_ALIASES[rawKey];
  }

  const nameKey = String(service.name || "").trim().toLowerCase();
  if (SERVICE_PLACEHOLDER_IMAGES[nameKey]) {
    return SERVICE_PLACEHOLDER_IMAGES[nameKey];
  }

  const categoryKey = String(service.category || "").trim().toLowerCase();
  if (SERVICE_CATEGORY_FALLBACK_IMAGES[categoryKey]) {
    return SERVICE_CATEGORY_FALLBACK_IMAGES[categoryKey];
  }

  return raw || "assets/hero-service.svg";
}

async function apiCall(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const token = localStorage.getItem("authToken");
  if (token) {
    options.headers.Authorization = token;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return { success: false, message: "Server connection failed" };
  }
}

async function registerUser(username, email, password, confirmPassword, accountType, profile = {}) {
  return apiCall("/auth/register", "POST", {
    username,
    email,
    password,
    confirmPassword,
    accountType,
    profile,
  });
}

async function loginUser(username, password, accountType) {
  return apiCall("/auth/login", "POST", { username, password, accountType });
}

async function forgotPassword(email) {
  return apiCall("/auth/forgot-password", "POST", { email });
}

async function getProfile() {
  return apiCall("/profile", "GET");
}

async function updateProfile(payload) {
  return apiCall("/profile", "PATCH", payload);
}

async function getServices(query = "", filters = {}) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const q = params.toString();
  return apiCall(`/services${q ? `?${q}` : ""}`, "GET");
}

async function getServiceById(serviceId) {
  return apiCall(`/services/${serviceId}`, "GET");
}

async function getServiceSlots(serviceId, date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiCall(`/services/${serviceId}/slots${q}`, "GET");
}

async function getServiceReviews(serviceId) {
  return apiCall(`/services/${serviceId}/reviews`, "GET");
}

async function createBooking(payload) {
  return apiCall("/bookings", "POST", payload);
}

async function getMyBookings() {
  return apiCall("/bookings/me", "GET");
}

async function getBookingById(bookingId) {
  return apiCall(`/bookings/${bookingId}`, "GET");
}

async function getBookingMessages(bookingId) {
  return apiCall(`/bookings/${bookingId}/messages`, "GET");
}

async function sendBookingMessage(bookingId, text) {
  return apiCall(`/bookings/${bookingId}/messages`, "POST", { text });
}

async function getBookingTickets(bookingId) {
  return apiCall(`/bookings/${bookingId}/tickets`, "GET");
}

async function createBookingTicket(bookingId, payload) {
  return apiCall(`/bookings/${bookingId}/tickets`, "POST", payload);
}

async function updateBookingTicket(bookingId, ticketId, payload) {
  return apiCall(`/bookings/${bookingId}/tickets/${ticketId}`, "PATCH", payload);
}

async function updateMyBooking(bookingId, payload) {
  return apiCall(`/bookings/${bookingId}`, "PATCH", payload);
}

async function rebookBooking(bookingId, payload = {}) {
  return apiCall(`/bookings/${bookingId}/rebook`, "POST", payload);
}

async function providerUpdateBookingStatus(bookingId, status) {
  return apiCall(`/provider/bookings/${bookingId}/status`, "PATCH", { status });
}

async function getProviderDashboard() {
  return apiCall("/provider/dashboard", "GET");
}

async function providerRequestVerification(notes = "") {
  return apiCall("/provider/verification/request", "POST", { notes });
}

async function getFavorites() {
  return apiCall("/favorites", "GET");
}

async function saveFavorite(serviceId) {
  return apiCall("/favorites", "POST", { serviceId });
}

async function removeFavorite(serviceId) {
  return apiCall(`/favorites/${serviceId}`, "DELETE");
}

async function getAddresses() {
  return apiCall("/addresses", "GET");
}

async function saveAddress(payload, addressId = null) {
  const endpoint = addressId ? `/addresses/${addressId}` : "/addresses";
  const method = addressId ? "PATCH" : "POST";
  return apiCall(endpoint, method, payload);
}

async function deleteAddress(addressId) {
  return apiCall(`/addresses/${addressId}`, "DELETE");
}

async function submitReview(payload) {
  return apiCall("/reviews", "POST", payload);
}

async function getMyReviews() {
  return apiCall("/reviews/me", "GET");
}

async function getNotifications() {
  return apiCall("/notifications", "GET");
}

async function markNotificationRead(notificationId) {
  return apiCall(`/notifications/${notificationId}/read`, "PATCH");
}
