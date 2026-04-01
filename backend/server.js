const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;

// 🔗 Connect MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/home_services")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// 🧑 User Schema
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

// Middleware
app.use(cors());
app.use(express.json());


// ================= REGISTER =================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.json({ success: false, message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.json({ success: true, message: "Registration successful" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================= LOGIN =================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: username }, { username: username }],
    });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    // 🔐 JWT TOKEN
    const token = jwt.sign({ id: user._id }, "secret123", {
      expiresIn: "1h",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================= PROTECTED ROUTE =================
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/api/dashboard", authMiddleware, (req, res) => {
  res.json({
    message: "Welcome to Dashboard",
    userId: req.user.id,
  });
});

// ✅ FIXED BY LAKHAN SINGH: Get all users (for testing)
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});


// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});