/* File Overview: frontend/js/bookings.js — bookings for frontend UI behavior. */
window.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/auth";
    return;
  }

  await loadBookings();
});

async function loadBookings() {
  const root = document.getElementById("bookings-root");
  const result = await getMyBookings();
  if (!result.success) {
    root.innerHTML = `<p>${result.message || "Could not load bookings"}</p>`;
    return;
  }

  if (!result.bookings.length) {
    root.innerHTML = "<p>No bookings yet.</p>";
    return;
  }

  root.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Service</th>
          <th>Date</th>
          <th>Status</th>
          <th>Amount</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${result.bookings.map((booking) => `
          <tr>
            <td>${booking.serviceName}</td>
            <td>${new Date(booking.scheduledAt).toLocaleString()}</td>
            <td><span class="chip ${booking.status}">${booking.status}</span></td>
            <td>$${(booking.price * booking.quantity).toFixed(2)}</td>
            <td>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn-ghost" onclick="window.location.href='/booking?id=${booking._id}'">Details</button>
                <button class="btn-ghost" onclick="rebookFromHistory('${booking._id}')">Rebook</button>
                ${booking.status === "cancelled" ? "-" : `<button class="btn-ghost" onclick="cancelBooking('${booking._id}')">Cancel</button>`}
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function cancelBooking(bookingId) {
  if (!confirm("Cancel this booking?")) return;
  const result = await updateMyBooking(bookingId, { status: "cancelled" });
  if (result.success) {
    await loadBookings();
  } else {
    alert(result.message || "Could not cancel booking");
  }
}

async function rebookFromHistory(bookingId) {
  const result = await rebookBooking(bookingId);
  if (result.success) {
    window.location.href = `/booking?id=${result.booking._id}`;
    return;
  }

  alert(result.message || "Could not rebook service");
}
