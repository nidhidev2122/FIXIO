/* File Overview: frontend/js/service.js — service for frontend UI behavior. */
window.addEventListener("DOMContentLoaded", async function () {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("id");
  if (!serviceId) {
    document.getElementById("service-root").innerHTML = "<p>Service not found.</p>";
    return;
  }

  await loadServicePage(serviceId);
});

let currentService = null;
let currentReviews = [];
let favoriteIds = new Set();
let selectedSlotDate = "";
const GUEST_FAVORITES_KEY = "fixio-guest-favorites";

function getGuestFavoriteIds() {
  return JSON.parse(localStorage.getItem(GUEST_FAVORITES_KEY) || "[]")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function setGuestFavoriteIds(ids) {
  localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(Array.from(new Set(ids.map((item) => String(item))).values())));
}

async function loadServicePage(serviceId) {
  const token = localStorage.getItem("authToken");
  const [serviceResult, favoritesResult] = await Promise.all([
    getServiceReviews(serviceId),
    token ? getFavorites().catch(() => ({ success: false, favorites: [] })) : Promise.resolve({ success: false, favorites: [] }),
  ]);

  if (!serviceResult.success) {
    document.getElementById("service-root").innerHTML = `<p>${serviceResult.message || "Service not found."}</p>`;
    return;
  }

  currentService = serviceResult.service;
  currentReviews = serviceResult.reviews || [];
  if (favoritesResult.success) {
    favoriteIds = new Set((favoritesResult.favorites || []).map((item) => String(item.serviceId)));
  } else {
    favoriteIds = new Set(getGuestFavoriteIds());
  }

  renderServicePage();
}

function renderServicePage() {
  const service = currentService;
  if (!service) return;

  const isFavorite = favoriteIds.has(String(service._id));
  const averageRating = currentReviews.length
    ? (currentReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / currentReviews.length).toFixed(1)
    : Number(service.rating || 4.7).toFixed(1);
  const providerTrust = service.providerVerifiedBadge ? "Verified provider" : "Verification pending";

  document.getElementById("service-root").innerHTML = `
    <article class="card">
      <img src="${getServiceImage(service)}" alt="${service.name}" style="width:100%; height:230px; object-fit:cover; border-radius:10px;" />
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <h2 style="margin:0;">${service.name}</h2>
        <button type="button" class="btn-ghost" onclick="toggleFavorite('${service._id}')">${isFavorite ? '♥ Saved' : '♡ Save'}</button>
      </div>
      <p>${service.description}</p>
      <p><strong>Category:</strong> ${service.category}</p>
      <p><strong>ETA:</strong> ${service.eta}</p>
      <p><strong>Rating:</strong> ${averageRating} (${currentReviews.length} reviews)</p>
      <p><strong>Provider:</strong> ${service.providerName || 'FIXIO network'} ${service.providerName ? `• ${providerTrust}` : ''}</p>
      <h3>$${service.price}</h3>
      <button class="btn-primary" onclick="quickAddToCart('${service._id}', '${service.name.replace(/'/g, "\\'")}', ${service.price})">Add to Cart</button>
    </article>

    <article class="card">
      <h3>Book This Service</h3>
      <div class="field">
        <label>Service date</label>
        <input type="date" id="booking-slot-date" onchange="loadSlotsForDate('${service._id}')" />
      </div>
      <div class="field">
        <label>Available slot</label>
        <select id="booking-slot-time">
          <option value="">Select a date first</option>
        </select>
      </div>
      <div class="field">
        <label>Address</label>
        <textarea id="booking-address" rows="3" placeholder="House no, street, area"></textarea>
      </div>
      <div class="field">
        <label>Notes</label>
        <textarea id="booking-notes" rows="3" placeholder="Any special instructions"></textarea>
      </div>
      <button class="btn-primary" onclick="bookNow('${service._id}')">Book Now</button>
    </article>

    <article class="card" style="grid-column: 1 / -1;">
      <h3>Reviews</h3>
      <div id="service-reviews-list" class="reviews-list"></div>
    </article>
  `;

  renderReviewsList();
  setDefaultSlotDate(service._id);
}

function setDefaultSlotDate(serviceId) {
  const dateInput = document.getElementById("booking-slot-date");
  if (!dateInput) return;

  const tomorrow = new Date(Date.now() + 86400000);
  const dateKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  dateInput.value = dateKey;
  loadSlotsForDate(serviceId);
}

async function loadSlotsForDate(serviceId) {
  const dateInput = document.getElementById("booking-slot-date");
  const slotSelect = document.getElementById("booking-slot-time");
  if (!dateInput || !slotSelect) return;

  const slotDate = dateInput.value;
  selectedSlotDate = slotDate;
  if (!slotDate) {
    slotSelect.innerHTML = '<option value="">Select a date first</option>';
    return;
  }

  const result = await getServiceSlots(serviceId, slotDate);
  if (!result.success) {
    slotSelect.innerHTML = '<option value="">No slots available</option>';
    return;
  }

  const slots = result.slots || [];
  if (!slots.length) {
    slotSelect.innerHTML = '<option value="">No slots available for selected date</option>';
    return;
  }

  slotSelect.innerHTML = [
    '<option value="">Select a slot</option>',
    ...slots.map((slot) => `<option value="${slot.time}" ${slot.available ? "" : "disabled"}>${slot.time}${slot.available ? "" : " (Booked)"}</option>`),
  ].join("");
}

function renderReviewsList() {
  const root = document.getElementById("service-reviews-list");
  if (!root) return;

  if (!currentReviews.length) {
    root.innerHTML = "<p>No reviews yet. Be the first to add one after a completed booking.</p>";
    return;
  }

  root.innerHTML = currentReviews.map((review) => `
    <article class="review-card" style="margin-bottom:12px; padding:12px; border:1px solid rgba(157,195,255,0.2); border-radius:10px;">
      <strong>${"★".repeat(Number(review.rating || 0))}</strong>
      <p style="margin:8px 0 0;">${review.comment || "No comment"}</p>
    </article>
  `).join("");
}

async function toggleFavorite(serviceId) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    if (favoriteIds.has(String(serviceId))) {
      favoriteIds.delete(String(serviceId));
    } else {
      favoriteIds.add(String(serviceId));
    }
    setGuestFavoriteIds(Array.from(favoriteIds));
    renderServicePage();
    return;
  }

  if (favoriteIds.has(String(serviceId))) {
    await removeFavorite(serviceId);
    favoriteIds.delete(String(serviceId));
  } else {
    await saveFavorite(serviceId);
    favoriteIds.add(String(serviceId));
  }

  renderServicePage();
}

function quickAddToCart(id, name, price) {
  addToCart({ id, name, price, location: "Mumbai" });
  alert("Added to cart");
}

async function bookNow(serviceId) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("Please login first");
    window.location.href = "/auth";
    return;
  }

  const slotDate = document.getElementById("booking-slot-date").value;
  const slotTime = document.getElementById("booking-slot-time").value;
  if (!slotDate || !slotTime) {
    alert("Please select date and slot");
    return;
  }

  const payload = {
    serviceId,
    quantity: 1,
    location: "Mumbai",
    address: document.getElementById("booking-address").value,
    notes: document.getElementById("booking-notes").value,
    slotDate,
    slotTime,
    scheduledAt: new Date(`${slotDate}T${slotTime}:00`).toISOString(),
  };

  const result = await createBooking(payload);
  if (result.success) {
    alert("Booking created successfully");
    window.location.href = "/bookings";
  } else {
    alert(result.message || "Could not create booking");
  }
}
