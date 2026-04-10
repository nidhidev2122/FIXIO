/* File Overview: frontend/js/cart-page.js — cart page for frontend UI behavior. */
// Cart page logic
window.addEventListener("DOMContentLoaded", function () {
  renderCart();
  updateCartSummary();
  maybeResumeCheckoutAfterAuth();
});

function maybeResumeCheckoutAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  const shouldResume = params.get("checkout") === "1";
  const token = localStorage.getItem("authToken");

  if (!shouldResume || !token) {
    return;
  }

  // Clean URL first to avoid re-running checkout on refresh.
  window.history.replaceState({}, "", "/cart");
  handleCheckout();
}

function renderCart() {
  const items = getCartItems();
  const container = document.getElementById("cart-items");
  
  if (items.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#999;'>Your cart is empty</p>";
    return;
  }
  
  container.innerHTML = items.map((item, idx) => `
    <div class="cart-item">
      <div class="item-info">
        <h4>${item.name}</h4>
        <p>${item.location || "Location not specified"}</p>
      </div>
      <div class="item-price">$${item.price}</div>
      <div class="item-quantity">
        <button onclick="decreaseQuantity(${idx})">-</button>
        <input type="number" value="${item.quantity}" readonly>
        <button onclick="increaseQuantity(${idx})">+</button>
      </div>
      <div class="item-total">$${item.price * item.quantity}</div>
      <button class="remove-btn" onclick="removeItem(${idx})">✕</button>
    </div>
  `).join("");
}

function increaseQuantity(idx) {
  const items = getCartItems();
  if (items[idx]) {
    items[idx].quantity += 1;
    writeCart(items);
    renderCart();
    updateCartSummary();
  }
}

function decreaseQuantity(idx) {
  const items = getCartItems();
  if (items[idx] && items[idx].quantity > 1) {
    items[idx].quantity -= 1;
    writeCart(items);
    renderCart();
    updateCartSummary();
  }
}

function removeItem(idx) {
  const items = getCartItems();
  items.splice(idx, 1);
  writeCart(items);
  renderCart();
  updateCartSummary();
}

function updateCartSummary() {
  const total = getCartTotal();
  document.getElementById("subtotal").textContent = `$${total.toFixed(2)}`;
  document.getElementById("total").textContent = `$${total.toFixed(2)}`;
}

async function handleCheckout() {
  const items = getCartItems();
  if (items.length === 0) {
    alert("Your cart is empty");
    return;
  }
  
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("Login or register to continue to payment.");
    window.location.href = "/auth?next=%2Fcart%3Fcheckout%3D1";
    return;
  }

  const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  let created = 0;

  for (const item of items) {
    const result = await createBooking({
      serviceId: item.id,
      quantity: item.quantity,
      location: item.location || "Mumbai",
      scheduledAt: bookingDate,
      address: "Address will be confirmed by support",
      notes: "Booked from cart checkout",
    });
    if (result.success) {
      created += 1;
    }
  }

  if (created > 0) {
    clearCart();
    renderCart();
    updateCartSummary();
    alert(`Booking created for ${created} service(s).`);
    window.location.href = "/bookings";
    return;
  }

  alert("Could not create booking. Please try again.");
}

function handleClearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    clearCart();
    renderCart();
    updateCartSummary();
  }
}

function goHome() {
  window.location.href = "/";
}

function writeCart(items) {
  localStorage.setItem("fixio-cart", JSON.stringify(items));
}
