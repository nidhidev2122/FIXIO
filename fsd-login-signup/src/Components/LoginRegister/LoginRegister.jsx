/* global FB */
import React, { useState } from "react";
import "./LoginRegister.css";
import { FaUser, FaLock } from "react-icons/fa";
import { SlEnvolope } from "react-icons/sl";
import { FaGoogle, FaFacebook } from "react-icons/fa";

const LoginRegister = () => {
  const [action, setAction] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Login state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  // Register state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const levels = [
      { level: 1, text: "Weak", color: "#ff4444" },
      { level: 2, text: "Fair", color: "#ffaa00" },
      { level: 3, text: "Good", color: "#ffff00" },
      { level: 4, text: "Strong", color: "#88dd00" },
      { level: 5, text: "Very Strong", color: "#00dd00" },
    ];

    return levels[strength - 1] || { level: 0, text: "", color: "" };
  };

  // Validation functions
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateLogin = () => {
    if (!loginForm.username.trim()) {
      setMessage({ type: "error", text: "Username is required" });
      return false;
    }
    if (!loginForm.password.trim()) {
      setMessage({ type: "error", text: "Password is required" });
      return false;
    }
    return true;
  };

  const validateRegister = () => {
    if (!registerForm.username.trim()) {
      setMessage({ type: "error", text: "Username is required" });
      return false;
    }
    if (!registerForm.email.trim()) {
      setMessage({ type: "error", text: "Email is required" });
      return false;
    }
    if (!validateEmail(registerForm.email)) {
      setMessage({ type: "error", text: "Invalid email format" });
      return false;
    }
    if (!registerForm.password.trim()) {
      setMessage({ type: "error", text: "Password is required" });
      return false;
    }
    if (registerForm.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return false;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return false;
    }
    if (!registerForm.agreeTerms) {
      setMessage({ type: "error", text: "Please agree to terms & conditions" });
      return false;
    }
    return true;
  };

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();                         
    setMessage({ type: "", text: "" });

    if (!validateLogin()) return;

    setLoading(true);
    try {                          
      const response = await fetch("http://localhost:5000/api/auth/login", {  // FIXED BY LAKHAN SINGH: Updated API route to match backend JWT route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
          rememberMe: loginForm.rememberMe,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
          // ✅ FIXED BY LAKHAN SINGH: Always store token for dashboard authentication
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

        setLoginForm({
          username: "",
          password: "",
          rememberMe: false,
        });
        // ✅ FIXED BY LAKHAN SINGH: Redirect user to dashboard after successful login
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Server connection failed. Make sure the backend is running on port 5000.",
      });
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle register submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!validateRegister()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password,
          confirmPassword: registerForm.confirmPassword,
          agreeTerms: registerForm.agreeTerms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setRegisterForm({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
        });
        // Switch to login form after success
        setTimeout(() => {
          setAction("");
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Server connection failed. Make sure the backend is running on port 5000.",
      });
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(forgotPasswordEmail)) {
      setMessage({ type: "error", text: "Enter a valid email address" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();
      setMessage({ 
        type: data.success ? "success" : "error", 
        text: data.message 
      });

      if (data.success) {
        setForgotPasswordEmail("");
        setTimeout(() => setShowForgotPassword(false), 2000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Server connection failed. Make sure the backend is running on port 5000.",
      });
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google OAuth
  React.useEffect(() => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'mock-google-client-id-for-testing';
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
    }
  }, []);

  // Initialize Facebook SDK
  React.useEffect(() => {
    const facebookAppId = process.env.REACT_APP_FACEBOOK_APP_ID || 'mock-facebook-app-id-for-testing';
    window.fbAsyncInit = function () {
      if (window.FB) {
        FB.init({
          appId: facebookAppId,
          xfbml: true,
          version: "v18.0",
        });
      }
    };
  }, []);

  // Handle Google OAuth response
  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setMessage({ type: "info", text: "Authenticating with Google..." });
    try {
      // Use real token if available, otherwise use mock token for testing
      const token = response?.credential || 'mock-google-token-for-testing-' + Math.random().toString(36).substr(2, 9);
      
      const backendResponse = await fetch("http://localhost:5000/api/auth/social-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "Google",
          token: token,
        }),
      });

      const data = await backendResponse.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setMessage({ 
          type: "error", 
          text: data.message || "Google authentication failed" 
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Server connection failed. Make sure the backend is running.",
      });
      console.error("Google auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Facebook OAuth response
  const handleFacebookResponse = async (response) => {
    setLoading(true);
    setMessage({ type: "info", text: "Authenticating with Facebook..." });
    try {
      // Use real token if available, otherwise use mock token for testing
      const token = response?.authResponse?.accessToken || 'mock-facebook-token-for-testing-' + Math.random().toString(36).substr(2, 9);
      
      const backendResponse = await fetch("http://localhost:5000/api/auth/social-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "Facebook",
          token: token,
        }),
      });

      const data = await backendResponse.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setMessage({ 
          type: "error", 
          text: data.message || "Facebook authentication failed" 
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Server connection failed. Make sure the backend is running.",
      });
      console.error("Facebook auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle social login button clicks
  const handleSocialLogin = (provider) => {
    if (provider === "Google") {
      // Trigger Google Sign-In dialog or mock login
      if (window.google && window.google.accounts.id) {
        window.google.accounts.id.renderButton(
          document.querySelector(".google-signin-btn"),
          { theme: "outline", size: "large" }
        );
      } else {
        // If Google SDK not loaded, use mock login
        handleGoogleResponse({});
      }
    } else if (provider === "Facebook") {
      // Trigger Facebook Login or mock login
      if (window.FB) {
        window.FB.login(handleFacebookResponse, { scope: "public_profile,email" });
      } else {
        // If Facebook SDK not loaded, use mock login
        handleFacebookResponse({});
      }
    }
  };

  const passwordStrength = getPasswordStrength(registerForm.password);

  return (
    <>
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <p>Enter your email address to receive a password reset link</p>
            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="input-box">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  aria-label="Email for password reset"
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowForgotPassword(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={`wrapper ${action}`}>
        {/* Message Display */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* LOGIN FORM */}
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>

            <div className="input-box">
              <input
                type="text"
                placeholder="Username or Email"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                aria-label="Username or Email"
                disabled={loading}
                required
              />
              <FaUser className="icon" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                aria-label="Password"
                disabled={loading}
                required
              />
              <FaLock className="icon" aria-hidden="true" />
            </div>

            <div className="remember-forgot">
              <label>
                <input
                  type="checkbox"
                  checked={loginForm.rememberMe}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, rememberMe: e.target.checked })
                  }
                  aria-label="Remember me"
                  disabled={loading}
                />
                Remember me
              </label>
              <button
                type="button"
                className="link-button"
                onClick={() => setShowForgotPassword(true)}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* Social Login */}
            <div className="social-login">
              <p>Or login with</p>
              <div className="social-buttons">
                <button
                  type="button"
                  className="social-btn google"
                  onClick={() => handleSocialLogin("Google")}
                  aria-label="Login with Google"
                  disabled={loading}
                >
                  <FaGoogle />
                </button>
                <button
                  type="button"
                  className="social-btn facebook"
                  onClick={() => handleSocialLogin("Facebook")}
                  aria-label="Login with Facebook"
                  disabled={loading}
                >
                  <FaFacebook />
                </button>
              </div>
            </div>

            <div className="register-link">
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setAction("active")}
                >
                  Register
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* REGISTER FORM */}
        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Registration</h1>

            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                aria-label="Username"
                disabled={loading}
                required
              />
              <FaUser className="icon" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                aria-label="Email"
                disabled={loading}
                required
              />
              <SlEnvolope className="icon" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                aria-label="Password"
                disabled={loading}
                required
              />
              <FaLock className="icon" aria-hidden="true" />
            </div>

            {/* Password Strength Indicator */}
            {registerForm.password && (
              <div className="password-strength">
                <div className="strength-label">Password Strength:</div>
                <div className="strength-bar">
                  <div
                    className={`strength-fill strength-${passwordStrength.level}`}
                    style={{ width: `${(passwordStrength.level / 5) * 100}%` }}
                  ></div>
                </div>
                <div
                  className="strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </div>
              </div>
            )}

            <div className="input-box">
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  })
                }
                aria-label="Confirm Password"
                disabled={loading}
                required
              />
              <FaLock className="icon" aria-hidden="true" />
            </div>

            <div className="remember-forgot">
              <label>
                <input
                  type="checkbox"
                  checked={registerForm.agreeTerms}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      agreeTerms: e.target.checked,
                    })
                  }
                  aria-label="I agree to the terms and conditions"
                  disabled={loading}
                />
                I agree to the terms & conditions
              </label>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>

            {/* Social Login */}
            <div className="social-login">
              <p>Or register with</p>
              <div className="social-buttons">
                <button
                  type="button"
                  className="social-btn google"
                  onClick={() => handleSocialLogin("Google")}
                  aria-label="Register with Google"
                  disabled={loading}
                >
                  <FaGoogle />
                </button>
                <button
                  type="button"
                  className="social-btn facebook"
                  onClick={() => handleSocialLogin("Facebook")}
                  aria-label="Register with Facebook"
                  disabled={loading}
                >
                  <FaFacebook />
                </button>
              </div>
            </div>

            <div className="register-link">
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setAction("")}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginRegister;