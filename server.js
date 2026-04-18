// 🚀 COMPLETE AI BACKEND (USING GROQ API - FAST & FREE TIER FRIENDLY)
// 🚀 COMPLETE AI BACKEND (USING GROQ API - FAST & FREE TIER FRIENDL// 🚀 COMPLETE AI BACKEND (USING GROQ API - FAST & FREE TIER FRIENDLY)

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const fetch = require("node-fetch");

const app = express();

// 🔐 Security
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 📦 In-memory DB
let users = [];
let plans = {};
let attendance = {};

const SECRET = "smartstudentsecret";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🔑 TOKEN
function generateToken(user) {
  return jwt.sign({ email: user.email }, SECRET, { expiresIn: "7d" });
}

// 🔐 AUTH MIDDLEWARE
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ✅ SIGNUP
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "User exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = { name, email, password: hashed };

  users.push(user);

  const token = generateToken(user);
  res.json({ token, user: { name, email } });
});

// ✅ LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = generateToken(user);
  res.json({ token, user: { name: user.name, email: user.email } });
});

// ✅ USER
app.get("/me", auth, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  res.json({ user: { name: user.name, email: user.email } });
});

// 🤖 GROQ AI FUNCTION
async function askAI(prompt) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "AI error";
}

// 🤖 CHAT
app.post("/chat", auth, async (req, res) => {
  const { message } = req.body;

  try {
    const reply = await askAI(message);
    res.json({ reply });
  } catch {
    res.json({ reply: "AI unavailable" });
  }
});

// 📄 SUMMARIZER
app.post("/summarize", auth, async (req, res) => {
  const { text } = req.body;

  try {
    const summary = await askAI(`Summarize this:\n${text}`);
    res.json({ summary });
  } catch {
    res.json({ summary: "AI unavailable" });
  }
});

// 🧠 QUIZ
app.post("/quiz", auth, async (req, res) => {
  const { topic } = req.body;

  try {
    const result = await askAI(`Create 3 quiz questions on ${topic}`);
    const quiz = result.split("\n");
    res.json({ quiz });
  } catch {
    res.json({ quiz: ["AI error"] });
  }
});

// 📚 STUDY PLANNER
app.post("/planner", auth, (req, res) => {
  const { plan } = req.body;
  plans[req.user.email] = plan;
  res.json({ message: "Plan saved", plan });
});

app.get("/planner", auth, (req, res) => {
  res.json({ plan: plans[req.user.email] || "" });
});

// 📊 ATTENDANCE
app.post("/attendance", auth, (req, res) => {
  const { subject, attended, total } = req.body;

  if (!attendance[req.user.email]) attendance[req.user.email] = [];

  attendance[req.user.email].push({ subject, attended, total });

  res.json({ message: "Attendance saved" });
});

app.get("/attendance", auth, (req, res) => {
  res.json({ data: attendance[req.user.email] || [] });
});

// 🚀 SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
