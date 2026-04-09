/* File Overview: frontend/js/provider-dashboard.js — provider dashboard for frontend UI behavior. */
window.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/auth";
    return;
  }

  const result = await getProviderDashboard();
  if (!result.success) {
    document.body.insertAdjacentHTML("afterbegin", `<pre style="padding:16px; color:#b91c1c;">${result.message || "Provider dashboard unavailable"}</pre>`);
    return;
  }

  renderProviderDashboard(result.dashboard);
});

function renderProviderDashboard(dashboard) {
  const user = dashboard.user || {};
  const stats = dashboard.stats || {};
  const verificationStatus = String(user.profile?.verificationStatus || "not_required");
  const isVerified = Boolean(user.profile?.verificationBadge);

  document.getElementById("provider-stats").innerHTML = `
    <div class="grid two">
      <div class="card"><strong>${stats.requests || 0}</strong><p>Requests</p></div>
      <div class="card"><strong>$${Number(stats.earnings || 0).toFixed(2)}</strong><p>Earnings</p></div>
      <div class="card"><strong>${stats.pending || 0}</strong><p>Pending</p></div>
      <div class="card"><strong>${stats.completed || 0}</strong><p>Completed</p></div>
    </div>
  `;

  document.getElementById("provider-profile").innerHTML = `
    <img src="${user.profile?.avatarUrl || buildAvatarPlaceholder(user.username)}" alt="${user.username || "Provider"} profile picture" style="width:64px; height:64px; border-radius:999px; object-fit:cover; border:1px solid rgba(157,195,255,0.35); margin-bottom:8px;" />
    <h3>${user.username}</h3>
    <p><strong>Category:</strong> ${user.profile?.serviceCategory || 'Not set'}</p>
    <p><strong>Availability:</strong> ${user.profile?.availability || 'Weekdays'}</p>
    <p><strong>Verification:</strong> ${verificationStatus}${isVerified ? ' • Badge active' : ''}</p>
    <p><strong>Average rating:</strong> ${stats.averageRating || '0.0'}</p>
    ${isVerified ? "" : '<button class="btn-primary" onclick="requestVerification()">Request verification review</button>'}
  `;

  document.getElementById("provider-availability-root").innerHTML = renderAvailability(user.profile?.blockedDates || []);

  document.getElementById("provider-bookings-root").innerHTML = renderBookings(dashboard.bookings || []);
  document.getElementById("provider-services-root").innerHTML = renderServices(dashboard.services || []);
  document.getElementById("provider-reviews-root").innerHTML = renderReviews(dashboard.reviews || []);
  document.getElementById("provider-notifications-root").innerHTML = renderNotifications(dashboard.notifications || []);
}

function renderAvailability(blockedDates) {
  const dates = Array.isArray(blockedDates) ? blockedDates.filter(Boolean) : [];
  if (!dates.length) return "<p>No blocked dates added yet.</p>";

  return `
    <div class="grid two">
      ${dates.map((date) => `
        <article class="card">
          <strong>${formatBlockedDate(date)}</strong>
          <p>Unavailable</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderBookings(bookings) {
  if (!bookings.length) return "<p>No matching requests yet.</p>";
  return `
    <table class="table">
      <thead><tr><th>Service</th><th>User</th><th>Scheduled</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${bookings.map((booking) => `
          <tr>
            <td>${booking.serviceName}</td>
            <td>${booking.userId}</td>
            <td>${new Date(booking.scheduledAt).toLocaleString()}</td>
            <td><span class="chip ${booking.status}">${booking.status}</span></td>
            <td>
              <select onchange="changeProviderStatus('${booking._id}', this.value)">
                <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>pending</option>
                <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
                <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>completed</option>
                <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
              </select>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderServices(services) {
  if (!services.length) return "<p>No services in your category yet.</p>";
  return `
    <div class="grid two">
      ${services.map((service) => `
        <article class="card">
          <h4>${service.name}</h4>
          <p>${service.description}</p>
          <p><strong>Price:</strong> $${service.price}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderReviews(reviews) {
  if (!reviews.length) return "<p>No reviews yet.</p>";
  return reviews.map((review) => `
    <article class="card" style="margin-bottom:10px;">
      <strong>${"★".repeat(Number(review.rating || 0))}</strong>
      <p>${review.comment || "No comment"}</p>
    </article>
  `).join("");
}

function renderNotifications(notifications) {
  if (!notifications.length) return "<p>No notifications yet.</p>";
  return notifications.map((notification) => `
    <article class="card" style="margin-bottom:10px;">
      <strong>${notification.title}</strong>
      <p>${notification.message}</p>
    </article>
  `).join("");
}

async function changeProviderStatus(bookingId, status) {
  const result = await providerUpdateBookingStatus(bookingId, status);
  if (!result.success) {
    alert(result.message || "Could not update status");
  } else {
    window.location.reload();
  }
}

async function requestVerification() {
  const notes = prompt("Optional note for verification review:", "") ?? "";
  const result = await providerRequestVerification(notes);
  if (!result.success) {
    alert(result.message || "Could not submit verification request");
    return;
  }
  alert("Verification request submitted.");
  window.location.reload();
}

function formatBlockedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function buildAvatarPlaceholder(name) {
  const letter = String(name || "U").trim().charAt(0).toUpperCase() || "U";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#2563eb'/></linearGradient></defs><rect width='160' height='160' rx='80' fill='url(#g)'/><text x='80' y='100' text-anchor='middle' font-size='72' fill='#ffffff' font-family='Inter, Segoe UI, Arial, sans-serif' font-weight='700'>${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}