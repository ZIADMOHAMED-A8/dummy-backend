import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cookieParser());

// ✅ PostgreSQL connection
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: false, // لو Railway أو Supabase ممكن تحتاج true
});

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

// Middleware عشان نفك الكوكي
async function authMiddleware(req, res, next) {
  const userId = req.cookies["session_user"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const result = await pool.query("SELECT id, email, username FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) return res.status(401).json({ message: "Invalid session" });
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
}

// ✅ POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // حفظ session في كوكي
    res.cookie("session_user", user.id, {
      httpOnly: true,
      sameSite: "none", // عشان Vercel
      secure: true,     // عشان HTTPS
    });

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // تحقق لو اليوزر موجود قبل كده
    const exists = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // إدخال اليوزر الجديد
    const result = await pool.query(
      "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email, password, username]
    );

    const newUser = result.rows[0];

    // دخّل اليوزر على طول بعد التسجيل (زي login)
    res.cookie("session_user", newUser.id, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    res.status(201).json({
      message: "Signup successful",
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ GET /auth/me
app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
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
