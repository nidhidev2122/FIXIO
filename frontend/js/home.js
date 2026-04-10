/* File Overview: frontend/js/home.js — home for frontend UI behavior. */
// Homepage logic - vanilla JS
let services = [];
let favoriteServiceIds = new Set();
let notifications = [];
const COMPARE_KEY = 'fixio-compare-services';
const RECENT_SEARCHES_KEY = 'fixio-recent-searches';
let servicesLoadError = '';

function getEmergencyServices() {
  return [
    {
      _id: 'emergency-salon-women',
      name: 'Salon for Women',
      description: 'Waxing, facials, cleanup',
      eta: '45-75 min',
      price: 25,
      image: 'assets/salon.avif',
      category: 'Beauty',
      rating: 4.8,
    },
    {
      _id: 'emergency-hair-men',
      name: 'Hair Studio for Men',
      description: 'Haircut, shave, grooming',
      eta: '30-45 min',
      price: 30,
      image: 'assets/mensalon.webp',
      category: 'Beauty',
      rating: 4.7,
    },
    {
      _id: 'emergency-ac',
      name: 'AC & Appliance Repair',
      description: 'AC, fridge, washing machine',
      eta: '60-90 min',
      price: 60,
      image: 'assets/ac&appliance_repair.webp',
      category: 'Repair',
      rating: 4.9,
    },
    {
      _id: 'emergency-cleaning',
      name: 'Cleaning & Pest Control',
      description: 'Bathroom, kitchen, sofa, pest',
      eta: '90-150 min',
      price: 40,
      image: 'assets/cleaning_icon.avif',
      category: 'Cleaning',
      rating: 4.8,
    },
    {
      _id: 'emergency-electrician',
      name: 'Electricians',
      description: 'Switches, lights, wiring',
      eta: '45-70 min',
      price: 35,
      image: 'assets/electrician-tools-logo-18959726.webp',
      category: 'Repair',
      rating: 4.6,
    },
    {
      _id: 'emergency-plumber',
      name: 'Plumbers',
      description: 'Leakage, fitting, drainage',
      eta: '45-70 min',
      price: 45,
      image: 'assets/plumber.webp',
      category: 'Repair',
      rating: 4.7,
    },
  ];
}

window.addEventListener('DOMContentLoaded', function () {
  initHome().catch((err) => {
    console.error(err);
    alert("Could not load services right now.");
  });
  updateAuthButtons();
  updateCartBadge();
  bindFilterEvents();
});

async function initHome() {
  await loadServices();
  await loadUserExtras();
  renderCategories();
  renderMostBooked();
  renderFavoritesSection();
  renderCompareTray();
  setupSearch();
}

async function loadUserExtras() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    favoriteServiceIds = new Set();
    notifications = [];
    renderNotificationsBadge();
    return;
  }

  const [favoritesResult, notificationsResult] = await Promise.all([
    getFavorites().catch(() => ({ success: false, favorites: [] })),
    getNotifications().catch(() => ({ success: false, notifications: [] })),
  ]);

  if (favoritesResult.success) {
    favoriteServiceIds = new Set((favoritesResult.favorites || []).map((item) => String(item.serviceId)));
  }

  if (notificationsResult.success) {
    notifications = notificationsResult.notifications || [];
  }

  renderNotificationsBadge();
}

async function loadServices(query = "") {
  servicesLoadError = '';

  const result = await getServices(query);
  if (result.success) {
    services = result.services || [];
    return;
  }

  // Fallback for standalone frontend runs when relative /api is unavailable.
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/services${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await response.json();
    if (data.success) {
      services = data.services || [];
      return;
    }
  } catch (error) {
    // Leave final error messaging to the UI.
  }

  // Final safety net for hosted frontend when backend is unreachable.
  services = getEmergencyServices();
  servicesLoadError = '';
}

function safeInlineText(value) {
  return String(value).replace(/'/g, "\\'");
}

function renderProviderTrustChip(service) {
  return service && service.providerVerifiedBadge
    ? '<span class="chip">Verified provider</span>'
    : '';
}

function renderCategories() {
  const grid = document.getElementById('categories-grid');
  const filtered = getFilteredServices();

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-card">${servicesLoadError || 'No services found for your current filters.'}</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((cat) => {
      const safeName = safeInlineText(cat.name);
      const activeFavorite = isFavorite(cat._id);
      const imageSrc = getServiceImage(cat);
      return `
        <article class="category-card">
          <img src="${imageSrc}" alt="${cat.name}" loading="lazy">
          <div class="card-top-row">
            <span class="chip">${cat.category || 'General'}</span>
            <button type="button" class="favorite-btn ${activeFavorite ? 'active' : ''}" onclick="toggleFavorite('${cat._id}')">${activeFavorite ? '♥ Saved' : '♡ Save'}</button>
          </div>
          <h4>${cat.name}</h4>
          <p>${cat.description}</p>
          <p class="card-meta">⭐ ${Number(cat.rating || 4.7).toFixed(1)} • ${cat.eta}</p>
          ${renderProviderTrustChip(cat)}
          <span class="chip">${cat.eta}</span>
          <div class="booked-row">
            <button type="button" class="inline-link" onclick="goToService('${cat._id}')">View details</button>
            <button type="button" class="inline-link" onclick="addServiceToCart('${cat._id}', '${safeName}', ${cat.price})">Add to cart</button>
            <button type="button" class="inline-link ${isCompared(cat._id) ? 'compare-active' : ''}" onclick="toggleCompare('${cat._id}')">${isCompared(cat._id) ? 'Remove compare' : 'Compare'}</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderMostBooked() {
  const grid = document.getElementById('booked-grid');
  const list = getFilteredServices().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 4);

  if (!list.length) {
    grid.innerHTML = '<div class="empty-card">No popular services to show yet.</div>';
    return;
  }

  grid.innerHTML = list
    .map((item) => {
      const safeTitle = safeInlineText(item.name);
      const activeFavorite = isFavorite(item._id);
      const imageSrc = getServiceImage(item);
      return `
        <article class="booked-card">
          <img src="${imageSrc}" alt="${item.name}" loading="lazy">
          <div class="card-top-row">
            <span class="chip">${item.category || 'General'}</span>
            <button type="button" class="favorite-btn ${activeFavorite ? 'active' : ''}" onclick="toggleFavorite('${item._id}')">${activeFavorite ? '♥ Saved' : '♡ Save'}</button>
          </div>
          <p class="rating">⭐ ${Number(item.rating || 4.7).toFixed(2)}</p>
          <h4>${item.name}</h4>
          ${renderProviderTrustChip(item)}
          <div class="booked-row">
            <strong>$${item.price}</strong>
            <button type="button" class="inline-link" onclick="goToService('${item._id}')">Details</button>
            <button type="button" class="inline-link" onclick="addServiceToCart('${item._id}', '${safeTitle}', ${item.price})">Add</button>
            <button type="button" class="inline-link ${isCompared(item._id) ? 'compare-active' : ''}" onclick="toggleCompare('${item._id}')">${isCompared(item._id) ? 'Remove compare' : 'Compare'}</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderFavoritesSection() {
  const grid = document.getElementById('favorites-grid');
  if (!grid) return;

  const favorites = services.filter((service) => favoriteServiceIds.has(String(service._id)));
  if (!favorites.length) {
    grid.innerHTML = '<div class="empty-card">Save a service to keep it here for quick rebooking.</div>';
    return;
  }

  grid.innerHTML = favorites.slice(0, 4).map((item) => `
    <article class="booked-card">
      <img src="${getServiceImage(item)}" alt="${item.name}" loading="lazy">
      <div class="card-top-row">
        <span class="chip">${item.category || 'General'}</span>
        <button type="button" class="favorite-btn active" onclick="toggleFavorite('${item._id}')">♥ Saved</button>
      </div>
      <h4>${item.name}</h4>
      ${renderProviderTrustChip(item)}
      <p class="rating">⭐ ${Number(item.rating || 4.7).toFixed(2)}</p>
      <div class="booked-row">
        <strong>$${item.price}</strong>
        <button type="button" class="inline-link" onclick="goToService('${item._id}')">Open</button>
        <button type="button" class="inline-link ${isCompared(item._id) ? 'compare-active' : ''}" onclick="toggleCompare('${item._id}')">${isCompared(item._id) ? 'Remove compare' : 'Compare'}</button>
      </div>
    </article>
  `).join('');
}

function getCompareIds() {
  return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').filter(Boolean);
}

function setCompareIds(ids) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(Array.from(new Set(ids)).slice(0, 3)));
  renderCompareTray();
  renderCategories();
  renderMostBooked();
  renderFavoritesSection();
}

function isCompared(serviceId) {
  return getCompareIds().includes(String(serviceId));
}

function toggleCompare(serviceId) {
  const current = getCompareIds();
  const next = current.includes(String(serviceId))
    ? current.filter((item) => item !== String(serviceId))
    : current.concat(String(serviceId));

  setCompareIds(next);
}

function renderCompareTray() {
  const tray = document.getElementById('compare-tray');
  const list = document.getElementById('compare-tray-list');
  const compareButton = document.getElementById('compare-btn');
  const compareBadge = document.getElementById('compare-badge');
  const selectedIds = getCompareIds();

  if (compareButton) {
    compareButton.style.display = 'inline-flex';
  }

  if (compareBadge) {
    compareBadge.textContent = String(selectedIds.length);
    compareBadge.style.display = selectedIds.length ? 'inline-flex' : 'none';
  }

  if (!tray || !list) return;

  const selectedServices = selectedIds
    .map((serviceId) => services.find((item) => String(item._id) === String(serviceId)))
    .filter(Boolean);

  if (!selectedServices.length) {
    tray.setAttribute('hidden', 'hidden');
    list.innerHTML = '';
    return;
  }

  tray.removeAttribute('hidden');
  list.innerHTML = selectedServices.map((item) => `
    <button type="button" class="compare-pill" onclick="toggleCompare('${item._id}')">
      ${item.name}
      <span aria-hidden="true">×</span>
    </button>
  `).join('');
}

function setupSearch() {
  const input = document.getElementById('service-search');
  if (!input) return;

  input.addEventListener('input', function () {
    const query = String(input.value || '').trim();
    renderCategories();
    renderMostBooked();
    renderFavoritesSection();
    renderSearchSuggestions(query);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    const query = String(input.value || '').trim();
    if (!query) return;
    pushRecentSearch(query);
    renderRecentSearches();
    hideSearchSuggestions();
  });

  renderRecentSearches();
}

function getRecentSearches() {
  return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function pushRecentSearch(query) {
  const normalized = String(query || '').trim();
  if (!normalized) return;
  const current = getRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase());
  current.unshift(normalized);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(current.slice(0, 8)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  renderRecentSearches();
}

function renderRecentSearches() {
  const root = document.getElementById('recent-searches');
  if (!root) return;

  const recent = getRecentSearches();
  if (!recent.length) {
    root.innerHTML = '';
    return;
  }

  root.innerHTML = `
    <div class="recent-head">
      <span>Recent searches</span>
      <button type="button" class="inline-link" onclick="clearRecentSearches()">Clear</button>
    </div>
    <div class="recent-chip-list">
      ${recent.map((item) => `<button type="button" class="recent-chip" onclick="applySearch('${safeInlineText(item)}')">${item}</button>`).join('')}
    </div>
  `;
}

function buildSuggestions(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized || normalized.length < 2) {
    return [];
  }

  return services
    .filter((service) => {
      const name = String(service.name || '').toLowerCase();
      const category = String(service.category || '').toLowerCase();
      return name.includes(normalized) || category.includes(normalized);
    })
    .slice(0, 6)
    .map((service) => ({
      label: String(service.name || 'Service'),
      hint: String(service.category || 'General'),
    }));
}

function renderSearchSuggestions(query) {
  const root = document.getElementById('search-suggestions');
  if (!root) return;

  const suggestions = buildSuggestions(query);
  if (!suggestions.length) {
    hideSearchSuggestions();
    return;
  }

  root.innerHTML = suggestions.map((item) => `
    <button type="button" class="suggestion-item" onclick="applySearch('${safeInlineText(item.label)}')">
      <strong>${item.label}</strong>
      <span>${item.hint}</span>
    </button>
  `).join('');
  root.removeAttribute('hidden');
}

function hideSearchSuggestions() {
  const root = document.getElementById('search-suggestions');
  if (!root) return;
  root.setAttribute('hidden', 'hidden');
  root.innerHTML = '';
}

function applySearch(query) {
  const input = document.getElementById('service-search');
  if (!input) return;
  input.value = String(query || '');
  pushRecentSearch(input.value);
  renderRecentSearches();
  hideSearchSuggestions();
  renderCategories();
  renderMostBooked();
  renderFavoritesSection();
}

function bindFilterEvents() {
  ['category-filter', 'rating-filter', 'sort-filter'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', function () {
        renderCategories();
        renderMostBooked();
        renderFavoritesSection();
      });
    }
  });
}

function getFilteredServices() {
  const search = document.getElementById('service-search').value.trim().toLowerCase();
  const category = document.getElementById('category-filter')?.value || 'all';
  const minimumRating = Number(document.getElementById('rating-filter')?.value || 0);
  const sortBy = document.getElementById('sort-filter')?.value || 'rating';

  let filtered = services.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
    const matchesCategory = category === 'all' || String(item.category || 'General') === category;
    const matchesRating = Number(item.rating || 0) >= minimumRating;
    return matchesSearch && matchesCategory && matchesRating;
  });

  filtered = filtered.sort((a, b) => {
    if (sortBy === 'price-asc') return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === 'price-desc') return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === 'name') return String(a.name).localeCompare(String(b.name));
    return Number(b.rating || 0) - Number(a.rating || 0);
  });

  return filtered;
}

function isFavorite(serviceId) {
  return favoriteServiceIds.has(String(serviceId));
}

async function toggleFavorite(serviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Login to save favorites.');
    goToAuth();
    return;
  }

  if (isFavorite(serviceId)) {
    await removeFavorite(serviceId);
    favoriteServiceIds.delete(String(serviceId));
    notifyLocal('Removed from favorites');
  } else {
    await saveFavorite(serviceId);
    favoriteServiceIds.add(String(serviceId));
    notifyLocal('Added to favorites');
  }

  renderCategories();
  renderMostBooked();
  renderFavoritesSection();
}

function renderNotificationsBadge() {
  const badge = document.getElementById('notifications-badge');
  const button = document.getElementById('notifications-btn');
  const unread = notifications.filter((item) => !item.readAt).length;
  if (button) {
    button.style.display = localStorage.getItem('authToken') ? 'inline-flex' : 'none';
  }
  if (!badge) return;
  if (unread > 0) {
    badge.textContent = unread;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function toggleNotificationsPanel(forceOpen) {
  const panel = document.getElementById('notifications-panel');
  if (!panel) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hasAttribute('hidden');
  panel.toggleAttribute('hidden', !shouldOpen);
  if (shouldOpen) {
    renderNotificationsPanel();
  }
}

function renderNotificationsPanel() {
  const root = document.getElementById('notifications-list');
  if (!root) return;

  if (!notifications.length) {
    root.innerHTML = '<div class="empty-card">No notifications yet.</div>';
    return;
  }

  root.innerHTML = notifications.map((item) => `
    <article class="notification-item ${item.readAt ? 'read' : 'unread'}">
      <div>
        <strong>${item.title}</strong>
        <p>${item.message}</p>
      </div>
      <button type="button" class="inline-link" onclick="markNotification('${item._id}')">${item.readAt ? 'Read' : 'Mark read'}</button>
    </article>
  `).join('');
}

async function markNotification(notificationId) {
  await markNotificationRead(notificationId);
  notifications = notifications.map((item) => item._id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item);
  renderNotificationsBadge();
  renderNotificationsPanel();
}

function addServiceToCart(id, name, price) {
  const location = document.getElementById('location-input').value;
  addToCart({ id, name, price, location });
  updateCartBadge();
  alert(`Added '${name}' to cart.`);
}

function updateCartBadge() {
  const count = getCartCount();
  const badge = document.getElementById('cart-badge');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function updateAuthButtons() {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const authDiv = document.getElementById('auth-buttons');
  const profileDiv = document.getElementById('profile-buttons');
  const providerDashboardBtn = document.getElementById('provider-dashboard-btn');
  const compareButton = document.getElementById('compare-btn');

  if (token) {
    authDiv.style.display = 'none';
    profileDiv.style.display = 'flex';
    if (providerDashboardBtn) {
      const isProvider = user.role === 'provider';
      providerDashboardBtn.style.display = isProvider ? 'inline-block' : 'none';
    }
  } else {
    authDiv.style.display = 'flex';
    profileDiv.style.display = 'none';
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
      notificationsBtn.style.display = 'none';
    }
  }

  if (compareButton) {
    compareButton.style.display = 'inline-flex';
  }
}

function scrollToCategories() {
  document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
}

function goToCart() {
  window.location.href = '/cart';
}

function goToAuth() {
  window.location.href = '/auth';
}

function goToSignup() {
  window.location.href = '/auth?mode=signup';
}

function goToProfile() {
  window.location.href = '/profile';
}

function goToService(serviceId) {
  window.location.href = `/service?id=${encodeURIComponent(serviceId)}`;
}

function goToBookings() {
  window.location.href = '/bookings';
}

function goToProviderDashboard() {
  window.location.href = '/provider-dashboard';
}

function goToCompare() {
  const ids = getCompareIds();
  if (ids.length < 2) {
    window.location.href = '/compare';
    return;
  }
  window.location.href = `/compare?ids=${encodeURIComponent(ids.join(','))}`;
}

function notifyLocal(message) {
  const storageKey = 'fixio-local-notifications';
  const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
  current.unshift({ id: String(Date.now()), title: 'Update', message, createdAt: new Date().toISOString() });
  localStorage.setItem(storageKey, JSON.stringify(current.slice(0, 10)));
}

function handleLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  updateAuthButtons();
  alert('Logged out successfully');
  window.location.href = '/';
}
