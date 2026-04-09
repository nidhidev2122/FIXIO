/* File Overview: frontend/js/cart.js — cart for frontend UI behavior. */
// Cart management - vanilla JS
const CART_KEY = "fixio-cart";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getCartItems() {
  return readCart();
}

function addToCart(item) {
  const cart = readCart();
  const existing = cart.find((e) => e.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  writeCart(cart);
  return cart;
}

function updateCartQuantity(id, quantity) {
  const cart = readCart();
  const next = cart
    .map((item) => (item.id === id ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  writeCart(next);
  return next;
}

function removeFromCart(id) {
  const cart = readCart();
  const next = cart.filter((item) => item.id !== id);
  writeCart(next);
  return next;
}

function clearCart() {
  writeCart([]);
}

function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return readCart().reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
}
