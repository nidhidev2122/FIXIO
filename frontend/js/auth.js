/* File Overview: frontend/js/auth.js — auth for frontend UI behavior. */
// Auth page logic
let selectedAccountType = null;
let preferredSignupMode = false;
const SELECTED_ACCOUNT_TYPE_KEY = "fixio-selected-account-type";
const ACCOUNT_TYPE_STORAGE_KEY = "fixio-account-type";
const AUTH_TOKEN_STORAGE_KEY = "authToken";
const AUTH_USER_STORAGE_KEY = "user";

function getPostAuthRedirectPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (!next) return "/profile.html";

  // Basic same-origin guard to prevent open redirects.
  return next.startsWith("/") ? next : "/profile.html";
}

function setSelectedAccountType(type) {
  selectedAccountType = type;
  if (type === "consumer" || type === "provider") {
    sessionStorage.setItem(SELECTED_ACCOUNT_TYPE_KEY, type);
    localStorage.setItem(ACCOUNT_TYPE_STORAGE_KEY, type);
    document.body.dataset.accountType = type;
  }
}

function getSelectedAccountType() {
  if (selectedAccountType === "consumer" || selectedAccountType === "provider") {
    return selectedAccountType;
  }

  const bodyType = document.body?.dataset?.accountType;
  if (bodyType === "consumer" || bodyType === "provider") {
    selectedAccountType = bodyType;
    return bodyType;
  }

  const storedSessionType = sessionStorage.getItem(SELECTED_ACCOUNT_TYPE_KEY);
  if (storedSessionType === "consumer" || storedSessionType === "provider") {
    selectedAccountType = storedSessionType;
    document.body.dataset.accountType = storedSessionType;
    return storedSessionType;
  }

  const storedLocalType = localStorage.getItem(ACCOUNT_TYPE_STORAGE_KEY);
  if (storedLocalType === "consumer" || storedLocalType === "provider") {
    selectedAccountType = storedLocalType;
    sessionStorage.setItem(SELECTED_ACCOUNT_TYPE_KEY, storedLocalType);
    document.body.dataset.accountType = storedLocalType;
    return storedLocalType;
  }

  return null;
}

window.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const type = params.get("type");
  preferredSignupMode = mode === "signup";

  if ((sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) && !params.has("forceAuth")) {
    window.location.replace("/profile.html");
    return;
  }

  initPasswordFeatures();

  const storedType = sessionStorage.getItem(SELECTED_ACCOUNT_TYPE_KEY) || localStorage.getItem(ACCOUNT_TYPE_STORAGE_KEY);
  const initialType = type === "provider" || type === "consumer" ? type : (storedType === "provider" || storedType === "consumer" ? storedType : "consumer");
  chooseAccountType(initialType, preferredSignupMode || mode === "signup");
});

function initPasswordFeatures() {
  const registerPasswordInput = document.getElementById("register-password");
  if (!registerPasswordInput) return;

  updatePasswordStrength(registerPasswordInput.value);
  registerPasswordInput.addEventListener("input", function (event) {
    updatePasswordStrength(event.target.value);
  });
}

function showTypePicker() {
  chooseAccountType("consumer");
}

function chooseAccountType(type, openRegister = false) {
  const shouldOpenRegister = openRegister || preferredSignupMode;
  setSelectedAccountType(type);
  document.body.classList.toggle("provider-mode", type === "provider");

  const pretty = type === "provider" ? "Service Provider" : "Service Consumer";
  const noun = type === "provider" ? "Provider" : "Consumer";

  document.getElementById("account-type-chip").textContent = `${pretty} Account`;
  document.getElementById("register-account-type-chip").textContent = `${pretty} Account`;
  const loginSwitchButton = document.querySelector("#login-form .link-button.subtle");
  const registerSwitchButton = document.querySelector("#register-form .link-button.subtle");
  if (loginSwitchButton) {
    loginSwitchButton.textContent = type === "provider" ? "Switch to consumer" : "Switch to provider";
  }
  if (registerSwitchButton) {
    registerSwitchButton.textContent = type === "provider" ? "Switch to consumer" : "Switch to provider";
  }
  document.getElementById("login-title").textContent = `${noun} Login`;
  document.getElementById("register-title").textContent = `${noun} Registration`;
  document.getElementById("login-submit").textContent = `Login as ${noun}`;
  document.getElementById("register-submit").textContent = `Register as ${noun}`;

  const providerFields = document.getElementById("provider-extra-fields");
  providerFields.style.display = type === "provider" ? "block" : "none";

  if (shouldOpenRegister) {
    switchToRegister();
  } else {
    switchToLogin();
  }
}

function toggleAccountType() {
  const currentType = getSelectedAccountType() || "consumer";
  chooseAccountType(currentType === "consumer" ? "provider" : "consumer", document.getElementById("register-form")?.style.display === "block");
}

function resetAccountType() {
  toggleAccountType();
}

function togglePassword(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  button.innerHTML = isPassword ? "&#128584;" : "&#128065;";
  button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  button.setAttribute("title", isPassword ? "Hide password" : "Show password");
}

function updatePasswordStrength(password) {
  const label = document.getElementById("strength-label");
  const fill = document.getElementById("strength-fill");
  const wrapper = document.getElementById("password-strength");
  if (!label || !fill || !wrapper) return;

  if (!password) {
    wrapper.classList.remove("visible");
    label.textContent = "";
    fill.style.width = "0%";
    fill.classList.remove("weak", "fair", "good", "strong", "very-strong");
    return;
  }

  wrapper.classList.add("visible");

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const levels = [
    { text: "Weak", width: "20%", cls: "weak" },
    { text: "Weak", width: "20%", cls: "weak" },
    { text: "Fair", width: "45%", cls: "fair" },
    { text: "Good", width: "70%", cls: "good" },
    { text: "Strong", width: "88%", cls: "strong" },
    { text: "Very Strong", width: "100%", cls: "very-strong" },
  ];

  const level = levels[score] || levels[0];
  label.textContent = level.text;
  fill.style.width = level.width;
  fill.classList.remove("weak", "fair", "good", "strong", "very-strong");
  fill.classList.add(level.cls);
}

function switchToLogin() {
  getSelectedAccountType() || setSelectedAccountType("consumer");
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("forgot-password-form").style.display = "none";
}

function switchToRegister() {
  getSelectedAccountType() || setSelectedAccountType("consumer");
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
  document.getElementById("forgot-password-form").style.display = "none";
}

function showForgotPassword() {
  getSelectedAccountType() || setSelectedAccountType("consumer");
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("forgot-password-form").style.display = "block";
}

function showLogin() {
  switchToLogin();
}

function setAuthBusy(isBusy) {
  const loginSubmit = document.getElementById("login-submit");
  const registerSubmit = document.getElementById("register-submit");
  if (loginSubmit) {
    loginSubmit.disabled = isBusy;
  }
  if (registerSubmit) {
    registerSubmit.disabled = isBusy;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const accountType = getSelectedAccountType() || "consumer";
  setSelectedAccountType(accountType);

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  if (!username.trim() || !password) {
    showMessage("Enter your username/email and password.", "error");
    return;
  }

  setAuthBusy(true);
  try {
    const result = await loginUser(username, password, accountType);

    if (result.success) {
      localStorage.setItem("authToken", result.token);
      sessionStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      sessionStorage.setItem("user", JSON.stringify(result.user));
      showMessage("Login successful!", "success");
      const nextPath = getPostAuthRedirectPath();
      setTimeout(() => { window.location.replace(nextPath); }, 800);
    } else {
      showMessage(result.message || "Login failed", "error");
    }
  } finally {
    setAuthBusy(false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const accountType = getSelectedAccountType() || "consumer";
  setSelectedAccountType(accountType);

  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("register-confirm").value;
  const agreeTerms = document.getElementById("agree-terms");
  const serviceCategoryInput = document.getElementById("provider-service-category");
  const experienceYearsInput = document.getElementById("provider-experience-years");
  const availabilityInput = document.getElementById("provider-availability");
  const serviceCategory = serviceCategoryInput?.value.trim() || "";
  const experienceYearsValue = experienceYearsInput?.value;
  const availability = availabilityInput?.value.trim() || "";

  if (!username || !email || !password || !confirmPassword) {
    showMessage("Fill in all required fields.", "error");
    return;
  }

  if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) {
    showMessage("Enter a valid email address.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  if (!agreeTerms?.checked) {
    showMessage("Please accept the terms and conditions.", "error");
    return;
  }

  if (accountType === "provider" && !serviceCategory) {
    showMessage("Provider accounts need a service category.", "error");
    return;
  }

  if (experienceYearsValue !== "" && Number.isNaN(Number(experienceYearsValue))) {
    showMessage("Enter a valid number of experience years.", "error");
    return;
  }

  const profilePayload = {
    serviceCategory: accountType === "provider" ? serviceCategory : "",
    experienceYears: experienceYearsValue === "" ? 0 : Number(experienceYearsValue),
    availability: availability || "Weekdays",
  };

  setAuthBusy(true);
  try {
    const result = await registerUser(
      username,
      email,
      password,
      confirmPassword,
      accountType,
      profilePayload,
    );

    if (result.success) {
      localStorage.setItem("authToken", result.token);
      sessionStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      sessionStorage.setItem("user", JSON.stringify(result.user));
      showMessage("Registration successful!", "success");
      const nextPath = getPostAuthRedirectPath();
      setTimeout(() => { window.location.replace(nextPath); }, 800);
    } else {
      showMessage(result.message || "Registration failed", "error");
    }
  } finally {
    setAuthBusy(false);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();

  if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) {
    showMessage("Enter a valid email address.", "error");
    return;
  }

  const result = await forgotPassword(email);
  showMessage(result.message, result.success ? "success" : "error");

  if (result.success) {
    setTimeout(() => { showLogin(); }, 1400);
  }
}

function showMessage(text, type) {
  const msgDiv = document.getElementById("message");
  msgDiv.textContent = text;
  msgDiv.className = `message ${type}`;
  msgDiv.style.display = "block";
  setTimeout(() => {
    msgDiv.style.display = "none";
  }, 3000);
}
