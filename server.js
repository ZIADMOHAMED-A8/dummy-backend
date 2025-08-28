import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cookieParser());

// ✅ السماح بالـ cookies مع CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://exclusive-e-commerce-website-t64y.vercel.app",
    ],
    credentials: true,
  })
);

// ✅ PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway هيديك env جاهزة
  ssl: {
    rejectUnauthorized: false,
  },
});

// ✅ POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // حفظ session في كوكي
    res.cookie("session_user", user.id, {
      httpOnly: true,
      sameSite: "none", // عشان Vercel
      secure: true, // عشان HTTPS
    });

    res.json({
      message: "Login successful",
      user,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, password, email]
    );

    const newUser = result.rows[0];

    res.cookie("session_user", newUser.id, {
      httpOnly: true,
      sameSite: "lax",
    });

    res.status(201).json({
      message: "Signup successful",
      user: newUser,
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ GET /auth/me
app.get("/auth/me", async (req, res) => {
  const userId = req.cookies["session_user"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid session" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("❌ Me error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ POST /auth/logout
app.post("/auth/logout", (req, res) => {
  res.clearCookie("session_user");
  res.json({ message: "Logged out" });
});

// Run server
app.listen(3500, () =>
  console.log("✅ Server running on http://localhost:3500")
);
