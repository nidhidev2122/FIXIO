/* File Overview: frontend/js/booking.js — booking for frontend UI behavior. */
window.addEventListener("DOMContentLoaded", async function () {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get("id");
  if (!bookingId) {
    document.getElementById("booking-summary").innerHTML = "<p>Booking not found.</p>";
    return;
  }

  const result = await getBookingById(bookingId);
  if (!result.success) {
    document.getElementById("booking-summary").innerHTML = `<p>${result.message || "Booking not found."}</p>`;
    return;
  }

  renderBookingPage(result.booking);
  await loadBookingMessages(bookingId);
  await loadBookingSupportTickets(bookingId);
});

function renderBookingPage(booking) {
  document.getElementById("booking-summary").innerHTML = `
    <h3>${booking.serviceName}</h3>
    <p><strong>Status:</strong> ${booking.status}</p>
    <p><strong>Scheduled:</strong> ${new Date(booking.scheduledAt).toLocaleString()}</p>
    <p><strong>Slot:</strong> ${booking.slotLabel || "-"}</p>
    <p><strong>Location:</strong> ${booking.location || "Mumbai"}</p>
    <p><strong>Address:</strong> ${booking.address || "-"}</p>
    <p><strong>Notes:</strong> ${booking.notes || "-"}</p>
    <p><strong>Total:</strong> $${(Number(booking.price || 0) * Number(booking.quantity || 1)).toFixed(2)}</p>
  `;

  const canReview = booking.status === "completed" && !booking.reviewed;
  document.getElementById("booking-actions").innerHTML = `
    <h3>Actions</h3>
    <div class="grid">
      <button class="btn-ghost" onclick="updateBookingStatus('${booking._id}', 'cancelled')">Cancel</button>
      <button class="btn-ghost" onclick="rebookFromDetail('${booking._id}')">Rebook</button>
    </div>
    <div class="grid" style="margin-top:12px;">
      <div class="field">
        <label>Reschedule date</label>
        <input type="datetime-local" id="reschedule-date" />
      </div>
      <button class="btn-primary" onclick="rescheduleBooking('${booking._id}')">Reschedule</button>
    </div>
  `;

  document.getElementById("booking-timeline").innerHTML = (booking.statusHistory || []).map((entry) => `
    <article class="card" style="margin-bottom:10px;">
      <strong>${entry.status}</strong>
      <p style="margin:6px 0 0;">${entry.note || ''}</p>
      <small>${new Date(entry.createdAt).toLocaleString()}</small>
    </article>
  `).join("") || "<p>No timeline yet.</p>";

  document.getElementById("booking-review-root").innerHTML = canReview
    ? `
      <div class="grid">
        <div class="field">
          <label>Rating</label>
          <select id="review-rating">
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Okay</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
        </div>
        <div class="field">
          <label>Comment</label>
          <textarea id="review-comment" rows="4" placeholder="Share your experience"></textarea>
        </div>
        <button class="btn-primary" onclick="submitBookingReview('${booking._id}')">Submit Review</button>
      </div>
    `
    : `<p>${booking.reviewed ? 'This booking has already been reviewed.' : 'A review can be added after completion.'}</p>`;
}

async function updateBookingStatus(bookingId, status) {
  const result = await updateMyBooking(bookingId, { status });
  if (result.success) {
    window.location.reload();
  } else {
    alert(result.message || "Could not update booking");
  }
}

async function rescheduleBooking(bookingId) {
  const dateValue = document.getElementById("reschedule-date").value;
  if (!dateValue) {
    alert("Select a date first");
    return;
  }

  const result = await updateMyBooking(bookingId, { scheduledAt: new Date(dateValue).toISOString() });
  if (result.success) {
    window.location.reload();
  } else {
    alert(result.message || "Could not reschedule booking");
  }
}

async function rebookFromDetail(bookingId) {
  const result = await rebookBooking(bookingId);
  if (result.success) {
    window.location.href = `/booking?id=${result.booking._id}`;
    return;
  }

  alert(result.message || "Could not rebook service");
}

async function submitBookingReview(bookingId) {
  const payload = {
    bookingId,
    rating: Number(document.getElementById("review-rating").value),
    comment: document.getElementById("review-comment").value.trim(),
  };

  const result = await submitReview(payload);
  if (result.success) {
    alert("Review submitted");
    window.location.reload();
  } else {
    alert(result.message || "Could not submit review");
  }
}

async function loadBookingMessages(bookingId) {
  const root = document.getElementById("booking-chat-root");
  if (!root) return;

  const result = await getBookingMessages(bookingId);
  if (!result.success) {
    root.innerHTML = `<p>${result.message || "Could not load chat"}</p>`;
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const myId = String(user.id || "");
  const messages = result.messages || [];

  root.innerHTML = `
    <div class="chat-list" style="display:grid; gap:8px; max-height:280px; overflow:auto; margin-bottom:10px;">
      ${messages.length ? messages.map((message) => `
        <article class="card" style="padding:10px; border-color:${String(message.senderId) === myId ? 'rgba(94,182,255,0.45)' : 'rgba(157,195,255,0.18)'};">
          <strong>${message.senderRole}</strong>
          <p style="margin:6px 0 0;">${escapeChat(message.text)}</p>
          <small>${new Date(message.createdAt).toLocaleString()}</small>
        </article>
      `).join("") : '<p>No messages yet.</p>'}
    </div>
    <div class="grid" style="grid-template-columns: 1fr auto; align-items:end; gap:8px;">
      <div class="field">
        <label>New message</label>
        <textarea id="booking-chat-input" rows="2" placeholder="Type your message"></textarea>
      </div>
      <button class="btn-primary" onclick="sendBookingChatMessage('${bookingId}')">Send</button>
    </div>
  `;
}

async function sendBookingChatMessage(bookingId) {
  const input = document.getElementById("booking-chat-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    return;
  }

  const result = await sendBookingMessage(bookingId, text);
  if (!result.success) {
    alert(result.message || "Could not send message");
    return;
  }

  input.value = "";
  await loadBookingMessages(bookingId);
}

function escapeChat(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadBookingSupportTickets(bookingId) {
  const root = document.getElementById("booking-support-root");
  if (!root) return;

  const result = await getBookingTickets(bookingId);
  if (!result.success) {
    root.innerHTML = `<p>${result.message || "Could not load support tickets"}</p>`;
    return;
  }

  const tickets = result.tickets || [];
  root.innerHTML = `
    <article class="card" style="margin-bottom:12px;">
      <div class="grid" style="grid-template-columns:1fr; gap:8px;">
        <div class="field">
          <label>Subject</label>
          <input id="support-subject" type="text" maxlength="180" placeholder="What do you need help with?">
        </div>
        <div class="field">
          <label>Message</label>
          <textarea id="support-message" rows="3" maxlength="2500" placeholder="Describe your issue"></textarea>
        </div>
        <button class="btn-primary" onclick="createSupportTicket('${bookingId}')">Create support ticket</button>
      </div>
    </article>
    <div style="display:grid; gap:10px;">
      ${tickets.length ? tickets.map((ticket) => renderTicketCard(bookingId, ticket)).join("") : "<p>No support tickets yet.</p>"}
    </div>
  `;
}

function renderTicketCard(bookingId, ticket) {
  const responses = Array.isArray(ticket.responses) ? ticket.responses : [];
  return `
    <article class="card" style="padding:12px;">
      <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
        <strong>${escapeChat(ticket.subject || "Support request")}</strong>
        <span class="status-chip status-${escapeStatus(ticket.status)}">${escapeChat(ticket.status || "open")}</span>
      </div>
      <p style="margin:8px 0 0;">${escapeChat(ticket.message || "")}</p>
      <small>${new Date(ticket.createdAt).toLocaleString()}</small>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn-ghost" onclick="updateSupportTicket('${bookingId}','${ticket._id}','open')">Open</button>
        <button class="btn-ghost" onclick="updateSupportTicket('${bookingId}','${ticket._id}','in_progress')">In progress</button>
        <button class="btn-ghost" onclick="updateSupportTicket('${bookingId}','${ticket._id}','resolved')">Resolve</button>
      </div>
      <div style="margin-top:8px; display:grid; gap:6px;">
        ${responses.length ? responses.map((item) => `
          <div style="padding:8px; border:1px solid rgba(157,195,255,0.2); border-radius:8px;">
            <strong>${escapeChat(item.senderRole || "user")}</strong>
            <p style="margin:4px 0 0;">${escapeChat(item.text || "")}</p>
            <small>${new Date(item.createdAt).toLocaleString()}</small>
          </div>
        `).join("") : ""}
      </div>
      <div class="grid" style="grid-template-columns:1fr auto; align-items:end; margin-top:8px; gap:8px;">
        <div class="field">
          <label>Add response</label>
          <input id="ticket-response-${ticket._id}" type="text" maxlength="2500" placeholder="Write a reply">
        </div>
        <button class="btn-primary" onclick="replySupportTicket('${bookingId}','${ticket._id}')">Reply</button>
      </div>
    </article>
  `;
}

async function createSupportTicket(bookingId) {
  const subjectEl = document.getElementById("support-subject");
  const messageEl = document.getElementById("support-message");
  if (!subjectEl || !messageEl) return;

  const subject = subjectEl.value.trim();
  const message = messageEl.value.trim();
  if (!subject || !message) {
    alert("Enter subject and message to create a ticket.");
    return;
  }

  const result = await createBookingTicket(bookingId, { subject, message });
  if (!result.success) {
    alert(result.message || "Could not create support ticket");
    return;
  }

  subjectEl.value = "";
  messageEl.value = "";
  await loadBookingSupportTickets(bookingId);
}

async function updateSupportTicket(bookingId, ticketId, status) {
  const result = await updateBookingTicket(bookingId, ticketId, { status });
  if (!result.success) {
    alert(result.message || "Could not update ticket status");
    return;
  }
  await loadBookingSupportTickets(bookingId);
}

async function replySupportTicket(bookingId, ticketId) {
  const input = document.getElementById(`ticket-response-${ticketId}`);
  if (!input) return;
  const response = input.value.trim();
  if (!response) return;

  const result = await updateBookingTicket(bookingId, ticketId, { response });
  if (!result.success) {
    alert(result.message || "Could not send reply");
    return;
  }

  input.value = "";
  await loadBookingSupportTickets(bookingId);
}

function escapeStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "open") return "pending";
  if (status === "in_progress") return "confirmed";
  if (status === "resolved") return "completed";
  return ["pending", "confirmed", "completed", "cancelled"].includes(status) ? status : "pending";
}