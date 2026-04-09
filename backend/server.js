/* File Overview: backend/server.js — server for backend service logic. */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/home_services";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["consumer", "provider"], default: "consumer" },
  profile: {
    avatarUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    city: { type: String, default: "Mumbai" },
    address: { type: String, default: "" },
    bio: { type: String, default: "" },
    serviceCategory: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    availability: { type: String, default: "Weekdays" },
    blockedDates: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
    },
    verificationBadge: { type: Boolean, default: false },
    verificationNotes: { type: String, default: "" },
    verificationSubmittedAt: { type: Date, default: null },
    verificationUpdatedAt: { type: Date, default: null },
    notificationPrefs: {
      bookingUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      chatAlerts: { type: Boolean, default: true },
    },
  },
  createdAt: { type: Date, default: Date.now },
});

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  eta: { type: String, default: "45-75 min" },
  price: { type: Number, required: true, min: 1 },
  image: { type: String, default: "assets/hero-service.svg" },
  category: { type: String, default: "General" },
  rating: { type: Number, default: 4.7 },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  providerName: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  serviceName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  location: { type: String, default: "Mumbai" },
  address: { type: String, default: "" },
  scheduledAt: { type: Date, required: true },
  slotLabel: { type: String, default: "" },
  notes: { type: String, default: "" },
  reviewed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending",
  },
  statusHistory: [
    {
      status: { type: String, required: true },
      note: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  isHidden: { type: Boolean, default: false },
}, { timestamps: true });

const FavoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
}, { timestamps: true });

FavoriteSchema.index({ userId: 1, serviceId: 1 }, { unique: true });

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  label: { type: String, default: "Home" },
  recipientName: { type: String, default: "" },
  phone: { type: String, default: "" },
  city: { type: String, default: "Mumbai" },
  address: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "info" },
  readAt: { type: Date, default: null },
}, { timestamps: true });

const BookingMessageSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderRole: { type: String, enum: ["consumer", "provider"], default: "consumer" },
  text: { type: String, required: true, trim: true, maxlength: 1500 },
}, { timestamps: true });

const SupportTicketSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 2500 },
  status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
  responses: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      senderRole: { type: String, enum: ["consumer", "provider"], default: "consumer" },
      text: { type: String, trim: true, maxlength: 2500 },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
const Service = mongoose.model("Service", ServiceSchema);
const Booking = mongoose.model("Booking", BookingSchema);
const Review = mongoose.model("Review", ReviewSchema);
const Favorite = mongoose.model("Favorite", FavoriteSchema);
const Address = mongoose.model("Address", AddressSchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const BookingMessage = mongoose.model("BookingMessage", BookingMessageSchema);
const SupportTicket = mongoose.model("SupportTicket", SupportTicketSchema);

app.use(cors());
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, "../frontend");
app.use(express.static(FRONTEND_DIR));

const loginAttempts = new Map();
function getClientIp(req) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.connection.remoteAddress || "unknown";
}

function authRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const routeKey = String(req.path || req.originalUrl || "auth").toLowerCase();
  const identifier = String(
    req.body?.email || req.body?.username || req.body?.identifier || "anonymous"
  ).trim().toLowerCase();
  const key = `${ip}:${routeKey}:${identifier}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 20;
  const attemptInfo = loginAttempts.get(key) || { count: 0, start: now };

  if (now - attemptInfo.start > windowMs) {
    attemptInfo.count = 0;
    attemptInfo.start = now;
  }

  if (attemptInfo.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again in a few minutes.",
    });
  }

  attemptInfo.count += 1;
  loginAttempts.set(key, attemptInfo);
  next();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function sanitizeAvatarDataUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep avatar payload bounded because we store it as a data URL string.
  if (raw.length > 1_500_000) return null;

  const normalized = raw.replace(/\s+/g, "");
  const isImageDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(normalized);
  if (!isImageDataUrl) return null;

  const commaIndex = normalized.indexOf(",");
  const base64Payload = commaIndex >= 0 ? normalized.slice(commaIndex + 1) : "";
  if (!base64Payload) return null;

  try {
    const decoded = Buffer.from(base64Payload, "base64");
    const canonical = decoded.toString("base64").replace(/=+$/, "");
    const incoming = base64Payload.replace(/=+$/, "");
    return canonical === incoming ? normalized : null;
  } catch (err) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const rawToken = req.header("Authorization") || "";
  const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

async function seedServices() {
  const count = await Service.countDocuments();
  if (count > 0) return;

  await Service.insertMany([
    { name: "Salon for Women", description: "Waxing, facials, cleanup", eta: "45-75 min", price: 25, image: "assets/salon-women.svg", category: "Beauty", rating: 4.8 },
    { name: "Hair Studio for Men", description: "Haircut, shave, grooming", eta: "30-45 min", price: 30, image: "assets/hair-men.svg", category: "Beauty", rating: 4.7 },
    { name: "AC & Appliance Repair", description: "AC, fridge, washing machine", eta: "60-90 min", price: 60, image: "assets/ac-repair.svg", category: "Repair", rating: 4.9 },
    { name: "Cleaning & Pest Control", description: "Bathroom, kitchen, sofa, pest", eta: "90-150 min", price: 40, image: "assets/cleaning-pest.svg", category: "Cleaning", rating: 4.8 },
    { name: "Electricians", description: "Switches, lights, wiring", eta: "45-70 min", price: 35, image: "assets/electrician.svg", category: "Repair", rating: 4.6 },
    { name: "Plumbers", description: "Leakage, fitting, drainage", eta: "45-70 min", price: 45, image: "assets/plumber.svg", category: "Repair", rating: 4.7 },
  ]);
}

function appendStatusHistory(booking, status, note = "") {
  booking.statusHistory = booking.statusHistory || [];
  booking.statusHistory.push({ status, note, createdAt: new Date() });
  if (booking.statusHistory.length > 20) {
    booking.statusHistory = booking.statusHistory.slice(-20);
  }
}

async function createNotification(userId, title, message, type = "info") {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const prefs = user.profile?.notificationPrefs || {};
  if (type === "promo" && prefs.promotions === false) {
    return null;
  }
  if (type === "chat" && prefs.chatAlerts === false) {
    return null;
  }
  if (type !== "promo" && type !== "chat" && prefs.bookingUpdates === false) {
    return null;
  }

  return Notification.create({ userId, title, message, type });
}

async function loadServiceWithReviews(serviceId) {
  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return null;
  }

  const reviews = await Review.find({ serviceId, isHidden: false }).sort({ createdAt: -1 }).limit(30);
  const [enrichedService] = await enrichServicesWithProviderTrust([service]);
  return { service: enrichedService || service, reviews };
}

async function enrichServicesWithProviderTrust(services) {
  const list = (services || []).map((item) => (item && item.toObject ? item.toObject() : item)).filter(Boolean);
  const providerIds = list
    .map((item) => (item.providerId ? String(item.providerId) : ""))
    .filter(Boolean);

  if (!providerIds.length) {
    return list;
  }

  const providers = await User.find({ _id: { $in: providerIds } }, { username: 1, profile: 1 });
  const providerMap = new Map(providers.map((provider) => [String(provider._id), provider]));

  return list.map((service) => {
    const provider = providerMap.get(String(service.providerId || ""));
    const verificationStatus = String(provider?.profile?.verificationStatus || "not_required");
    const verificationBadge = Boolean(provider?.profile?.verificationBadge);

    return {
      ...service,
      providerName: service.providerName || provider?.username || "",
      providerVerificationStatus: verificationStatus,
      providerVerifiedBadge: verificationBadge,
    };
  });
}

const DEFAULT_TIME_SLOTS = [
  "09:00",
  "10:30",
  "12:00",
  "13:30",
  "15:00",
  "16:30",
  "18:00",
];

function dateKeyFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSlotTime(value) {
  const raw = String(value || "").trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw) ? raw : "";
}

function mergeDateAndTime(dateKey, timeKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(timeKey || ""))) return null;

  const value = `${String(dateKey || "").trim()}T${String(timeKey || "").trim()}:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function etaToMinutes(etaLabel) {
  const raw = String(etaLabel || "");
  const matches = raw.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const values = matches.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0);
  if (values.length === 0) return null;
  return values[0];
}

async function canAccessBooking(reqUserId, booking) {
  const user = await User.findById(reqUserId);
  if (!user || !booking) {
    return { allowed: false, user: null, service: null };
  }

  const service = await Service.findById(booking.serviceId);
  const ownsBooking = String(booking.userId) === String(reqUserId);
  const providerMatch = user.role === "provider"
    && service
    && user.profile?.serviceCategory
    && String(service.category || "").toLowerCase() === String(user.profile.serviceCategory || "").toLowerCase();

  return {
    allowed: ownsBooking || providerMatch,
    user,
    service,
  };
}

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      confirmPassword,
      accountType,
      profile,
    } = req.body;

    if (!username || !email || !password || !confirmPassword || !accountType) {
      return res.json({ success: false, message: "All fields required" });
    }
    if (!["consumer", "provider"].includes(String(accountType))) {
      return res.json({ success: false, message: "Please select Consumer or Provider account" });
    }
    if (!validateEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = accountType;
    const avatarUrl = sanitizeAvatarDataUrl(profile?.avatarUrl);
    if (avatarUrl === null) {
      return res.status(400).json({ success: false, message: "Invalid profile image format" });
    }

    const nextProfile = {
      avatarUrl,
      phone: String(profile?.phone || ""),
      city: String(profile?.city || "Mumbai"),
      address: String(profile?.address || ""),
      bio: String(profile?.bio || ""),
      serviceCategory: role === "provider" ? String(profile?.serviceCategory || "") : "",
      experienceYears: role === "provider" ? Number(profile?.experienceYears || 0) : 0,
      availability: role === "provider" ? String(profile?.availability || "Weekdays") : "Weekdays",
      blockedDates: role === "provider"
        ? Array.isArray(profile?.blockedDates)
          ? profile.blockedDates.map((date) => String(date || "").trim()).filter(Boolean)
          : []
        : [],
      verificationStatus: role === "provider" ? "pending" : "not_required",
      verificationBadge: false,
      verificationNotes: "",
      verificationSubmittedAt: role === "provider" ? new Date() : null,
      verificationUpdatedAt: role === "provider" ? new Date() : null,
      notificationPrefs: {
        bookingUpdates: profile?.notificationPrefs?.bookingUpdates !== false,
        promotions: profile?.notificationPrefs?.promotions !== false,
        chatAlerts: profile?.notificationPrefs?.chatAlerts !== false,
      },
    };

    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      profile: nextProfile,
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    return res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try {
    const { username, password, accountType } = req.body;
    if (!username || !password) {
      return res.json({ success: false, message: "Username and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: String(username).toLowerCase() }, { username }],
    });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    if (accountType && user.role !== accountType) {
      return res.json({
        success: false,
        message: `This account is registered as ${user.role}. Please switch account type.`
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/forgot-password", authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validateEmail(email)) {
      return res.json({ success: false, message: "Valid email required" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: false, message: "Email not found in our records" });
    }
    return res.json({
      success: true,
      message: "If this email exists, a password reset link has been sent",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.patch("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { username, profile } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (username) {
      user.username = String(username).trim();
    }

    const nextProfile = profile || {};
    if (Object.prototype.hasOwnProperty.call(nextProfile, "avatarUrl")) {
      const avatarUrl = sanitizeAvatarDataUrl(nextProfile.avatarUrl);
      if (avatarUrl === null) {
        return res.status(400).json({ success: false, message: "Invalid profile image format" });
      }
      user.profile.avatarUrl = avatarUrl;
    } else {
      user.profile.avatarUrl = String(user.profile.avatarUrl || "");
    }

    user.profile.phone = String(nextProfile.phone ?? user.profile.phone ?? "");
    user.profile.city = String(nextProfile.city ?? user.profile.city ?? "Mumbai");
    user.profile.address = String(nextProfile.address ?? user.profile.address ?? "");
    user.profile.bio = String(nextProfile.bio ?? user.profile.bio ?? "");
    const incomingPrefs = nextProfile.notificationPrefs || {};
    user.profile.notificationPrefs = {
      bookingUpdates: incomingPrefs.bookingUpdates ?? user.profile.notificationPrefs?.bookingUpdates ?? true,
      promotions: incomingPrefs.promotions ?? user.profile.notificationPrefs?.promotions ?? true,
      chatAlerts: incomingPrefs.chatAlerts ?? user.profile.notificationPrefs?.chatAlerts ?? true,
    };

    if (user.role === "provider") {
      user.profile.serviceCategory = String(nextProfile.serviceCategory ?? user.profile.serviceCategory ?? "");
      user.profile.experienceYears = Number(nextProfile.experienceYears ?? user.profile.experienceYears ?? 0);
      user.profile.availability = String(nextProfile.availability ?? user.profile.availability ?? "Weekdays");
      user.profile.blockedDates = Array.isArray(nextProfile.blockedDates)
        ? nextProfile.blockedDates
        : Array.isArray(user.profile.blockedDates)
          ? user.profile.blockedDates
          : [];
    }

    await user.save();
    return res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/services", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const sortBy = String(req.query.sortBy || "newest").trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const minRating = Number(req.query.minRating);
  const maxEtaMins = Number(req.query.maxEtaMins);

  const filter = { isActive: true };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
    ];
  }

  if (category) {
    filter.category = { $regex: `^${category}$`, $options: "i" };
  }

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {};
    if (Number.isFinite(minPrice)) filter.price.$gte = Math.max(0, minPrice);
    if (Number.isFinite(maxPrice)) filter.price.$lte = Math.max(0, maxPrice);
  }

  if (Number.isFinite(minRating)) {
    filter.rating = { ...(filter.rating || {}), $gte: Math.max(0, Math.min(5, minRating)) };
  }

  let sort = { createdAt: -1 };
  if (sortBy === "price_asc") sort = { price: 1, createdAt: -1 };
  if (sortBy === "price_desc") sort = { price: -1, createdAt: -1 };
  if (sortBy === "rating_desc") sort = { rating: -1, createdAt: -1 };
  if (sortBy === "best_match") sort = { rating: -1, price: 1, createdAt: -1 };

  const skip = (page - 1) * limit;
  let services = await Service.find(filter).sort(sort).skip(skip).limit(limit);

  if (Number.isFinite(maxEtaMins)) {
    const maxMinutes = Math.max(0, maxEtaMins);
    services = services.filter((service) => {
      const etaMinutes = etaToMinutes(service.eta);
      return etaMinutes === null ? true : etaMinutes <= maxMinutes;
    });
  }

  const enrichedServices = await enrichServicesWithProviderTrust(services);

  const total = await Service.countDocuments(filter);
  return res.json({ success: true, services: enrichedServices, page, limit, total });
});

app.get("/api/services/:id", async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service || !service.isActive) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  const [enrichedService] = await enrichServicesWithProviderTrust([service]);
  return res.json({ success: true, service: enrichedService || service });
});

app.get("/api/services/:id/slots", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const dateKey = String(req.query.date || dateKeyFromDate(new Date(Date.now() + 86400000))).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const provider = service.providerId ? await User.findById(service.providerId) : null;
    if (provider && Array.isArray(provider.profile?.blockedDates) && provider.profile.blockedDates.includes(dateKey)) {
      return res.json({ success: true, serviceId: service._id, date: dateKey, slots: [] });
    }

    const dayStart = new Date(`${dateKey}T00:00:00`);
    const dayEnd = new Date(`${dateKey}T23:59:59`);
    const booked = await Booking.find({
      serviceId: service._id,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed"] },
    });
    const bookedTimes = new Set(booked.map((item) => normalizeSlotTime(item.slotLabel || "") || `${String(new Date(item.scheduledAt).getHours()).padStart(2, "0")}:${String(new Date(item.scheduledAt).getMinutes()).padStart(2, "0")}`));

    const slots = DEFAULT_TIME_SLOTS.map((time) => ({
      time,
      available: !bookedTimes.has(time),
    }));

    return res.json({ success: true, serviceId: service._id, date: dateKey, slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const { serviceId, quantity, location, address, scheduledAt, slotDate, slotTime, notes } = req.body;
    if (!serviceId || (!scheduledAt && !(slotDate && slotTime))) {
      return res.json({ success: false, message: "serviceId and (scheduledAt or slotDate+slotTime) are required" });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.json({ success: false, message: "Service not found" });
    }

    const normalizedSlotTime = normalizeSlotTime(slotTime);
    const computedScheduledAt = slotDate && normalizedSlotTime
      ? mergeDateAndTime(slotDate, normalizedSlotTime)
      : new Date(scheduledAt);

    if (!computedScheduledAt || Number.isNaN(computedScheduledAt.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date/time selected" });
    }

    const duplicateBooking = await Booking.findOne({
      serviceId: service._id,
      scheduledAt: computedScheduledAt,
      status: { $in: ["pending", "confirmed"] },
    });
    if (duplicateBooking) {
      return res.status(409).json({ success: false, message: "This slot is already booked. Please choose another." });
    }

    const booking = await Booking.create({
      userId: req.user.id,
      serviceId: service._id,
      serviceName: service.name,
      price: service.price,
      quantity: Math.max(1, Number(quantity || 1)),
      location: String(location || "Mumbai"),
      address: String(address || ""),
      scheduledAt: computedScheduledAt,
      slotLabel: normalizedSlotTime,
      notes: String(notes || ""),
      status: "pending",
      statusHistory: [{ status: "pending", note: "Booking created", createdAt: new Date() }],
    });

    await createNotification(
      req.user.id,
      "Booking created",
      `Your booking for ${service.name} is pending confirmation.`,
      "success"
    );

    return res.json({ success: true, message: "Booking created", booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/bookings/:id([0-9a-fA-F]{24})", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const access = await canAccessBooking(req.user.id, booking);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const reviews = await Review.find({ bookingId: booking._id, isHidden: false });
    const messages = await BookingMessage.find({ bookingId: booking._id }).sort({ createdAt: 1 }).limit(250);
    return res.json({
      success: true,
      booking: {
        ...booking.toObject(),
        service: access.service,
        reviews,
        messages,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/bookings/:id/messages", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const access = await canAccessBooking(req.user.id, booking);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await BookingMessage.find({ bookingId: booking._id }).sort({ createdAt: 1 }).limit(250);
    return res.json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/bookings/:id/messages", authMiddleware, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const access = await canAccessBooking(req.user.id, booking);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const message = await BookingMessage.create({
      bookingId: booking._id,
      senderId: access.user._id,
      senderRole: access.user.role,
      text,
    });

    if (String(booking.userId) !== String(access.user._id)) {
      await createNotification(booking.userId, "New booking message", `You received a new message on booking ${booking.serviceName}.`, "chat");
    }

    return res.json({ success: true, message: "Message sent", chatMessage: message });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/bookings/:id/tickets", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const access = await canAccessBooking(req.user.id, booking);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const tickets = await SupportTicket.find({ bookingId: booking._id }).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/bookings/:id/tickets", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Only the customer can open support tickets" });
    }

    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    const user = await User.findById(req.user.id);
    const ticket = await SupportTicket.create({
      bookingId: booking._id,
      userId: req.user.id,
      subject,
      message,
      responses: [{
        senderId: req.user.id,
        senderRole: user?.role || "consumer",
        text: message,
        createdAt: new Date(),
      }],
    });

    await createNotification(req.user.id, "Support ticket created", `We received your support request for ${booking.serviceName}.`, "info");
    return res.json({ success: true, message: "Support ticket created", ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.patch("/api/bookings/:id/tickets/:ticketId", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const access = await canAccessBooking(req.user.id, booking);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, bookingId: booking._id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const user = access.user;
    const canModerate = String(ticket.userId) === String(user._id) || user.role === "provider";
    if (!canModerate) {
      return res.status(403).json({ success: false, message: "You cannot update this ticket" });
    }

    const status = String(req.body?.status || "").trim();
    const responseText = String(req.body?.response || "").trim();

    if (status) {
      if (!["open", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid ticket status" });
      }
      ticket.status = status;
    }

    if (responseText) {
      ticket.responses.push({
        senderId: user._id,
        senderRole: user.role,
        text: responseText,
        createdAt: new Date(),
      });
    }

    await ticket.save();
    return res.json({ success: true, message: "Ticket updated", ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/bookings/me", authMiddleware, async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return res.json({ success: true, bookings });
});

app.patch("/api/bookings/:id", authMiddleware, async (req, res) => {
  const { status, scheduledAt } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (status && ["cancelled", "pending", "confirmed"].includes(status)) {
    booking.status = status;
    appendStatusHistory(booking, status, "Updated by customer");
    await createNotification(req.user.id, "Booking updated", `Your booking status changed to ${status}.`, status === "cancelled" ? "warning" : "info");
  }
  if (scheduledAt) {
    booking.scheduledAt = new Date(scheduledAt);
  }
  await booking.save();
  return res.json({ success: true, message: "Booking updated", booking });
});

app.post("/api/bookings/:id/rebook", authMiddleware, async (req, res) => {
  try {
    const originalBooking = await Booking.findById(req.params.id);
    if (!originalBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(originalBooking.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only rebook your own booking" });
    }

    const service = await Service.findById(originalBooking.serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const requestedDate = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
    const fallbackDate = new Date(originalBooking.scheduledAt || Date.now());
    const nextScheduledAt = requestedDate && !Number.isNaN(requestedDate.getTime())
      ? requestedDate
      : new Date(Math.max(Date.now() + 86400000, fallbackDate.getTime() + 7 * 86400000));

    const booking = await Booking.create({
      userId: req.user.id,
      serviceId: service._id,
      serviceName: service.name,
      price: service.price,
      quantity: Math.max(1, Number(req.body?.quantity || originalBooking.quantity || 1)),
      location: String(req.body?.location || originalBooking.location || "Mumbai"),
      address: String(req.body?.address || originalBooking.address || ""),
      scheduledAt: nextScheduledAt,
      notes: String(req.body?.notes || originalBooking.notes || "Rebooked from history"),
      reviewed: false,
      status: "pending",
      statusHistory: [{ status: "pending", note: "Booking rebooked from history", createdAt: new Date() }],
    });

    await createNotification(
      req.user.id,
      "Rebooking created",
      `Your new booking for ${service.name} is scheduled for ${nextScheduledAt.toLocaleString()}.`,
      "success"
    );

    return res.json({ success: true, message: "Booking rebooked", booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.patch("/api/provider/bookings/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "provider") {
      return res.status(403).json({ success: false, message: "Provider access required" });
    }
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const service = await Service.findById(booking.serviceId);
    const categoryMatches = service && String(service.category || "").toLowerCase() === String(user.profile?.serviceCategory || "").toLowerCase();
    if (!categoryMatches) {
      return res.status(403).json({ success: false, message: "This booking does not belong to your service category" });
    }

    booking.status = status;
    appendStatusHistory(booking, status, "Updated by provider");
    await booking.save();

    await createNotification(booking.userId, "Booking status updated", `Your booking for ${booking.serviceName} is now ${status}.`, status === "completed" ? "success" : "info");
    return res.json({ success: true, message: "Status updated", booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/favorites", authMiddleware, async (req, res) => {
  const favorites = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 });
  const serviceIds = favorites.map((item) => item.serviceId);
  const services = await Service.find({ _id: { $in: serviceIds }, isActive: true });
  const serviceMap = new Map(services.map((service) => [String(service._id), service]));
  return res.json({
    success: true,
    favorites: favorites.map((favorite) => ({ ...favorite.toObject(), service: serviceMap.get(String(favorite.serviceId)) || null })),
  });
});

app.post("/api/favorites", authMiddleware, async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) {
      return res.status(400).json({ success: false, message: "serviceId is required" });
    }
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.user.id, serviceId },
      { userId: req.user.id, serviceId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: "Saved to favorites", favorite });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/favorites/:serviceId", authMiddleware, async (req, res) => {
  await Favorite.findOneAndDelete({ userId: req.user.id, serviceId: req.params.serviceId });
  return res.json({ success: true, message: "Removed from favorites" });
});

app.get("/api/addresses", authMiddleware, async (req, res) => {
  const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
  return res.json({ success: true, addresses });
});

app.post("/api/addresses", authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.address) {
      return res.status(400).json({ success: false, message: "address is required" });
    }

    if (payload.isDefault) {
      await Address.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const address = await Address.create({
      userId: req.user.id,
      label: String(payload.label || "Home"),
      recipientName: String(payload.recipientName || ""),
      phone: String(payload.phone || ""),
      city: String(payload.city || "Mumbai"),
      address: String(payload.address || ""),
      isDefault: Boolean(payload.isDefault),
    });

    return res.json({ success: true, message: "Address saved", address });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.patch("/api/addresses/:id", authMiddleware, async (req, res) => {
  const payload = req.body || {};
  if (payload.isDefault) {
    await Address.updateMany({ userId: req.user.id }, { isDefault: false });
  }
  const address = await Address.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, payload, { new: true });
  if (!address) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }
  return res.json({ success: true, message: "Address updated", address });
});

app.delete("/api/addresses/:id", authMiddleware, async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!address) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }
  return res.json({ success: true, message: "Address deleted" });
});

app.get("/api/reviews/me", authMiddleware, async (req, res) => {
  const reviews = await Review.find({ userId: req.user.id, isHidden: false }).sort({ createdAt: -1 });
  return res.json({ success: true, reviews });
});

app.get("/api/services/:id/reviews", async (req, res) => {
  const data = await loadServiceWithReviews(req.params.id);
  if (!data) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  return res.json({ success: true, service: data.service, reviews: data.reviews });
});

app.post("/api/reviews", authMiddleware, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ success: false, message: "bookingId and rating are required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only review your own booking" });
    }
    if (booking.reviewed) {
      return res.status(400).json({ success: false, message: "This booking has already been reviewed" });
    }

    const review = await Review.create({
      userId: req.user.id,
      bookingId: booking._id,
      serviceId: booking.serviceId,
      rating: Number(rating),
      comment: String(comment || ""),
    });

    booking.reviewed = true;
    await booking.save();
    return res.json({ success: true, message: "Review submitted", review });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
  return res.json({ success: true, notifications });
});

app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }
  return res.json({ success: true, message: "Notification marked as read", notification });
});

app.get("/api/provider/dashboard", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "provider") {
      return res.status(403).json({ success: false, message: "Provider access required" });
    }

    const category = String(user.profile?.serviceCategory || "").trim();
    const services = category ? await Service.find({ category: { $regex: `^${category}$`, $options: "i" }, isActive: true }) : [];
    const allBookings = await Booking.find().sort({ createdAt: -1 });
    const matchedBookings = [];
    for (const booking of allBookings) {
      const service = await Service.findById(booking.serviceId);
      if (service && String(service.category || "").toLowerCase() === category.toLowerCase()) {
        matchedBookings.push({ ...booking.toObject(), service });
      }
    }

    const reviews = await Review.find({ isHidden: false }).sort({ createdAt: -1 });
    const matchedReviews = [];
    for (const review of reviews) {
      const service = await Service.findById(review.serviceId);
      if (service && String(service.category || "").toLowerCase() === category.toLowerCase()) {
        matchedReviews.push({ ...review.toObject(), service });
      }
    }

    const stats = {
      services: services.length,
      requests: matchedBookings.length,
      pending: matchedBookings.filter((item) => item.status === "pending").length,
      confirmed: matchedBookings.filter((item) => item.status === "confirmed").length,
      completed: matchedBookings.filter((item) => item.status === "completed").length,
      earnings: matchedBookings
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
      averageRating: matchedReviews.length
        ? (matchedReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / matchedReviews.length).toFixed(1)
        : "0.0",
    };

    return res.json({
      success: true,
      dashboard: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
        services,
        bookings: matchedBookings.slice(0, 20),
        reviews: matchedReviews.slice(0, 20),
        notifications: await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(10),
        addresses: await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 }),
        stats,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/provider/verification/request", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== "provider") {
    return res.status(403).json({ success: false, message: "Provider access required" });
  }

  const notes = String(req.body?.notes || "").trim();
  user.profile.verificationStatus = "pending";
  user.profile.verificationBadge = false;
  user.profile.verificationNotes = notes;
  user.profile.verificationSubmittedAt = new Date();
  user.profile.verificationUpdatedAt = new Date();
  await user.save();

  return res.json({ success: true, message: "Verification request submitted" });
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
  res.json(users);
});

app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.get("/auth", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "auth.html")));
app.get("/cart", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "cart.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "profile.html")));
app.get("/service", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "service.html")));
app.get("/bookings", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "bookings.html")));
app.get("/booking", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "booking.html")));
app.get("/provider-dashboard", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "provider-dashboard.html")));
app.get("/compare", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "compare.html")));

seedServices()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });