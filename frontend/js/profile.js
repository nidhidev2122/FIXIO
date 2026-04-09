/* File Overview: frontend/js/profile.js — profile for frontend UI behavior. */
(function () {
  const TOKEN_KEY = "authToken";
  const USER_KEY = "user";

  const els = {};
  let currentUser = null;
  let allBookings = [];
  let blockedDates = [];
  let avatarDataUrl = "";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindActions();

    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace("/auth");
      return;
    }

    try {
      await loadProfileAndBookings();
    } catch (error) {
      console.error("Profile load failed:", error);
      setStatus("Unable to load profile", true);
    }
  }

  function cacheElements() {
    els.profileForm = document.getElementById("profile-form");
    els.profileStatus = document.getElementById("profile-status");
    els.usernameDisplay = document.getElementById("profile-username-display");
    els.roleBadge = document.getElementById("profile-role-badge");
    els.profileMeta = document.getElementById("profile-meta");
    els.providerSection = document.getElementById("provider-section");
    els.bookingsBody = document.getElementById("bookings-table-body");
    els.saveBtn = document.getElementById("save-btn");
    els.providerDashboardBtn = document.getElementById("provider-dashboard-btn");
    els.addressForm = document.getElementById("address-form");
    els.addressesRoot = document.getElementById("addresses-root");
    els.favoritesRoot = document.getElementById("favorites-root");
    els.notificationsRoot = document.getElementById("notifications-root");
    els.blockedDatesRoot = document.getElementById("blocked-dates-root");
    els.blockedDateInput = document.getElementById("blocked-date-input");
    els.addBlockedDateBtn = document.getElementById("add-blocked-date-btn");
    els.avatarImage = document.getElementById("profile-avatar-image");
    els.avatarFile = document.getElementById("avatar-file");
    els.removeAvatarBtn = document.getElementById("remove-avatar-btn");

    ["username", "phone", "city", "address", "bio", "serviceCategory", "experienceYears", "availability"].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    els.prefBookingUpdates = document.getElementById("pref-booking-updates");
    els.prefChatAlerts = document.getElementById("pref-chat-alerts");
    els.prefPromotions = document.getElementById("pref-promotions");
  }

  function bindActions() {
    els.profileForm.addEventListener("submit", handleSubmit);
    document.getElementById("home-btn").addEventListener("click", () => (window.location.href = "/"));
    document.getElementById("bookings-btn").addEventListener("click", () => (window.location.href = "/bookings"));
    document.getElementById("cart-btn").addEventListener("click", () => (window.location.href = "/cart"));
    document.getElementById("provider-dashboard-btn").addEventListener("click", () => (window.location.href = "/provider-dashboard"));
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
    els.addressForm.addEventListener("submit", handleAddressSubmit);
    if (els.addBlockedDateBtn) {
      els.addBlockedDateBtn.addEventListener("click", handleAddBlockedDate);
    }
    if (els.avatarFile) {
      els.avatarFile.addEventListener("change", handleAvatarFileChange);
    }
    if (els.removeAvatarBtn) {
      els.removeAvatarBtn.addEventListener("click", handleRemoveAvatar);
    }
  }

  async function loadProfileAndBookings() {
    const profileResult = await getProfile();
    if (!profileResult || !profileResult.success) {
      handleAuthFailure(profileResult?.message);
      return;
    }

    currentUser = profileResult.user || {};
    persistUser(currentUser);
    renderUser(currentUser);
    renderVisibility(currentUser);
    fillForm(currentUser);

    const bookingsResult = await getMyBookings();
    if (!bookingsResult || !bookingsResult.success) {
      renderBookingsError(bookingsResult?.message || "Could not load bookings");
      return;
    }

    allBookings = Array.isArray(bookingsResult.bookings) ? bookingsResult.bookings : [];
    renderStats(allBookings);
    renderBookingsTable(allBookings.slice(0, 6));
    await loadProfileExtras();
  }

  async function loadProfileExtras() {
    const [addressesResult, favoritesResult, notificationsResult] = await Promise.all([
      getAddresses().catch(() => ({ success: false, addresses: [] })),
      getFavorites().catch(() => ({ success: false, favorites: [] })),
      getNotifications().catch(() => ({ success: false, notifications: [] })),
    ]);

    renderAddresses(addressesResult.success ? addressesResult.addresses || [] : []);
    renderFavorites(favoritesResult.success ? favoritesResult.favorites || [] : []);
    renderProfileNotifications(notificationsResult.success ? notificationsResult.notifications || [] : []);
  }

  function persistUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function renderUser(user) {
    const role = normalizeRole(user.role);
    const verificationStatus = String(user.profile?.verificationStatus || "not_required");
    els.usernameDisplay.textContent = user.username || "Profile";
    els.roleBadge.textContent = role;
    els.roleBadge.className = `role-badge role-${role}`;
    const verificationLabel = role === "provider"
      ? ` • verification: ${verificationStatus}${user.profile?.verificationBadge ? " (badge active)" : ""}`
      : "";
    els.profileMeta.textContent = user.email
      ? `${user.email} • ${role} account${verificationLabel}`
      : `${role} account${verificationLabel}`;
    renderAvatar(user);
  }

  function renderVisibility(user) {
    const role = normalizeRole(user.role);
    const isPrivileged = role === "provider";
    els.providerSection.classList.toggle("is-hidden", !isPrivileged);
    els.providerDashboardBtn.classList.toggle("is-hidden", !isPrivileged);
  }

  function fillForm(user) {
    const profile = user.profile || {};
    els.username.value = user.username || "";
    els.phone.value = profile.phone || "";
    els.city.value = profile.city || "Mumbai";
    els.address.value = profile.address || "";
    els.bio.value = profile.bio || "";
    els.serviceCategory.value = profile.serviceCategory || "";
    els.experienceYears.value = Number.isFinite(Number(profile.experienceYears)) ? Number(profile.experienceYears) : 0;
    els.availability.value = profile.availability || "Weekdays";
    const notificationPrefs = profile.notificationPrefs || {};
    if (els.prefBookingUpdates) {
      els.prefBookingUpdates.checked = notificationPrefs.bookingUpdates !== false;
    }
    if (els.prefChatAlerts) {
      els.prefChatAlerts.checked = notificationPrefs.chatAlerts !== false;
    }
    if (els.prefPromotions) {
      els.prefPromotions.checked = notificationPrefs.promotions !== false;
    }
    avatarDataUrl = String(profile.avatarUrl || "");
    renderAvatar(user);
    blockedDates = normalizeBlockedDates(profile.blockedDates);
    renderBlockedDates();
  }

  function renderStats(bookings) {
    const total = bookings.length;
    const pending = bookings.filter((booking) => String(booking.status || "").toLowerCase() === "pending").length;
    const completed = bookings.filter((booking) => String(booking.status || "").toLowerCase() === "completed").length;

    document.getElementById("stat-total").textContent = String(total);
    document.getElementById("stat-pending").textContent = String(pending);
    document.getElementById("stat-completed").textContent = String(completed);
  }

  function renderBookingsTable(bookings) {
    if (!bookings.length) {
      els.bookingsBody.innerHTML = `<tr><td colspan="4" class="empty-state">No bookings found.</td></tr>`;
      return;
    }

    els.bookingsBody.innerHTML = bookings.map((booking) => {
      const serviceName = escapeHtml(booking.serviceName || booking.service?.name || "Service");
      const scheduledAt = formatDate(booking.scheduledAt || booking.createdAt);
      const status = normalizeStatus(booking.status);
      const amount = formatAmount(booking.price, booking.quantity);

      return `
        <tr>
          <td data-label="Service">${serviceName}</td>
          <td data-label="Date">${scheduledAt}</td>
          <td data-label="Status"><span class="status-chip status-${status}">${status}</span></td>
          <td data-label="Amount">${amount}</td>
        </tr>
      `;
    }).join("");
  }

  function renderAddresses(addresses) {
    if (!addresses.length) {
      els.addressesRoot.innerHTML = '<div class="empty-state">No saved addresses yet.</div>';
      return;
    }

    els.addressesRoot.innerHTML = addresses.map((address) => `
      <article class="stack-item">
        <div>
          <strong>${escapeHtml(address.label || 'Home')}</strong>
          <p>${escapeHtml(address.address || '')}</p>
          <small>${escapeHtml(address.city || '')} ${address.isDefault ? '• Default' : ''}</small>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" onclick="window.__editAddress('${address._id}')">Edit</button>
          <button type="button" class="btn btn-danger" onclick="window.__deleteAddress('${address._id}')">Delete</button>
        </div>
      </article>
    `).join('');
  }

  function renderFavorites(favorites) {
    if (!favorites.length) {
      els.favoritesRoot.innerHTML = '<div class="empty-state">No favorites yet.</div>';
      return;
    }

    els.favoritesRoot.innerHTML = favorites.map((favorite) => `
      <article class="stack-item">
        <div>
          <strong>${escapeHtml(favorite.service?.name || 'Service')}</strong>
          <p>${escapeHtml(favorite.service?.category || 'General')}</p>
          <small>$${Number(favorite.service?.price || 0).toFixed(2)}</small>
        </div>
        <button type="button" class="btn btn-secondary" onclick="window.location.href='/service?id=${favorite.serviceId}'">Open</button>
      </article>
    `).join('');
  }

  function renderProfileNotifications(notifications) {
    if (!notifications.length) {
      els.notificationsRoot.innerHTML = '<div class="empty-state">No notifications yet.</div>';
      return;
    }

    els.notificationsRoot.innerHTML = notifications.map((notification) => `
      <article class="stack-item ${notification.readAt ? '' : 'is-unread'}">
        <div>
          <strong>${escapeHtml(notification.title)}</strong>
          <p>${escapeHtml(notification.message)}</p>
        </div>
        <button type="button" class="btn btn-secondary" onclick="window.__markNotification('${notification._id}')">${notification.readAt ? 'Read' : 'Mark read'}</button>
      </article>
    `).join('');
  }

  function renderBookingsError(message) {
    els.bookingsBody.innerHTML = `<tr><td colspan="4" class="empty-state error">${escapeHtml(message)}</td></tr>`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("Saving profile...");
    toggleSaving(true);

    const role = normalizeRole(currentUser?.role);
    const payload = {
      username: els.username.value.trim(),
      profile: {
        phone: els.phone.value.trim(),
        city: els.city.value.trim(),
        address: els.address.value.trim(),
        bio: els.bio.value.trim(),
      },
    };

    if (role === "provider") {
      payload.profile.serviceCategory = els.serviceCategory.value.trim();
      payload.profile.experienceYears = Number(els.experienceYears.value || 0);
      payload.profile.availability = els.availability.value;
      payload.profile.blockedDates = blockedDates;
    }
    payload.profile.notificationPrefs = {
      bookingUpdates: Boolean(els.prefBookingUpdates?.checked),
      chatAlerts: Boolean(els.prefChatAlerts?.checked),
      promotions: Boolean(els.prefPromotions?.checked),
    };
    payload.profile.avatarUrl = avatarDataUrl;

    const result = await updateProfile(payload);
    toggleSaving(false);

    if (!result || !result.success) {
      setStatus(result?.message || "Could not save profile", true);
      return;
    }

    currentUser = result.user || currentUser;
    persistUser(currentUser);
    renderUser(currentUser);
    renderVisibility(currentUser);
    fillForm(currentUser);
    setStatus("Profile saved successfully");
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    const payload = {
      label: document.getElementById("address-label").value.trim() || "Home",
      recipientName: document.getElementById("recipient-name").value.trim(),
      phone: document.getElementById("address-phone").value.trim(),
      city: document.getElementById("address-city").value.trim() || "Mumbai",
      address: document.getElementById("address-line").value.trim(),
      isDefault: document.getElementById("address-default").checked,
    };

    const result = await saveAddress(payload);
    if (!result.success) {
      setStatus(result.message || "Could not save address", true);
      return;
    }

    setStatus("Address saved successfully");
    await loadProfileExtras();
    event.target.reset();
    document.getElementById("address-label").value = "Home";
    document.getElementById("address-city").value = "Mumbai";
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = "/";
  }

  function handleAuthFailure(message) {
    if (message) {
      console.warn(message);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.replace("/auth");
  }

  function setStatus(message, isError = false) {
    els.profileStatus.textContent = message;
    els.profileStatus.classList.toggle("error", Boolean(isError));
  }

  function toggleSaving(isSaving) {
    els.saveBtn.disabled = isSaving;
    els.saveBtn.textContent = isSaving ? "Saving..." : "Save Profile";
  }

  function normalizeRole(role) {
    const value = String(role || "consumer").toLowerCase();
    return ["consumer", "provider"].includes(value) ? value : "consumer";
  }

  function normalizeStatus(status) {
    const value = String(status || "pending").toLowerCase();
    return value || "pending";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatAmount(price, quantity) {
    const numericPrice = Number(price || 0);
    const numericQty = Number(quantity || 1);
    const total = numericPrice * numericQty;
    return Number.isFinite(total) ? `$${total.toFixed(2)}` : "$0.00";
  }

  function renderBlockedDates() {
    if (!els.blockedDatesRoot) return;

    if (!blockedDates.length) {
      els.blockedDatesRoot.innerHTML = '<div class="empty-state">No blocked dates added yet.</div>';
      return;
    }

    els.blockedDatesRoot.innerHTML = blockedDates.map((date) => `
      <button type="button" class="availability-chip" onclick="window.__removeBlockedDate('${date}')">
        ${formatBlockedDate(date)} <span aria-hidden="true">×</span>
      </button>
    `).join('');
  }

  function normalizeBlockedDates(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean))).sort();
  }

  function formatBlockedDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  function renderAvatar(user) {
    if (!els.avatarImage) return;

    const fallbackName = String(user?.username || currentUser?.username || "U");
    const displayAvatar = avatarDataUrl || String(user?.profile?.avatarUrl || "");
    els.avatarImage.src = displayAvatar || buildAvatarPlaceholder(fallbackName);
    els.avatarImage.alt = `${fallbackName} profile picture`;

    if (els.removeAvatarBtn) {
      els.removeAvatarBtn.disabled = !displayAvatar;
    }
  }

  function buildAvatarPlaceholder(name) {
    const letter = String(name || "U").trim().charAt(0).toUpperCase() || "U";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#2563eb'/></linearGradient></defs><rect width='160' height='160' rx='80' fill='url(#g)'/><text x='80' y='100' text-anchor='middle' font-size='72' fill='#ffffff' font-family='Inter, Segoe UI, Arial, sans-serif' font-weight='700'>${letter}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function handleRemoveAvatar() {
    avatarDataUrl = "";
    if (els.avatarFile) {
      els.avatarFile.value = "";
    }
    renderAvatar(currentUser);
    setStatus("Profile photo removed. Save profile to apply.");
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const isImage = String(file.type || "").startsWith("image/");
    if (!isImage) {
      setStatus("Please select an image file", true);
      event.target.value = "";
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (Number(file.size || 0) > maxBytes) {
      setStatus("Image must be 2 MB or smaller", true);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      avatarDataUrl = String(reader.result || "");
      renderAvatar(currentUser);
      setStatus("Profile photo selected. Save profile to apply.");
    };
    reader.onerror = function () {
      setStatus("Could not read selected image", true);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.__deleteAddress = async function (addressId) {
    const result = await deleteAddress(addressId);
    if (!result.success) {
      setStatus(result.message || "Could not delete address", true);
      return;
    }
    await loadProfileExtras();
  };

  window.__editAddress = async function (addressId) {
    const addressesResult = await getAddresses();
    const address = (addressesResult.addresses || []).find((item) => item._id === addressId);
    if (!address) return;
    document.getElementById("address-label").value = address.label || "Home";
    document.getElementById("recipient-name").value = address.recipientName || "";
    document.getElementById("address-phone").value = address.phone || "";
    document.getElementById("address-city").value = address.city || "Mumbai";
    document.getElementById("address-line").value = address.address || "";
    document.getElementById("address-default").checked = Boolean(address.isDefault);
    document.getElementById("address-form").scrollIntoView({ behavior: "smooth" });
  };

  window.__markNotification = async function (notificationId) {
    await markNotificationRead(notificationId);
    await loadProfileExtras();
  };

  window.__removeBlockedDate = function (dateValue) {
    blockedDates = blockedDates.filter((date) => date !== dateValue);
    renderBlockedDates();
  };

  function handleAddBlockedDate() {
    const dateValue = els.blockedDateInput.value;
    if (!dateValue) {
      setStatus("Select a date to block", true);
      return;
    }

    blockedDates = normalizeBlockedDates([...blockedDates, dateValue]);
    els.blockedDateInput.value = "";
    renderBlockedDates();
    setStatus("Blocked date added");
  }
})();
