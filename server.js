import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cookieParser());

// ✅ السماح بالـ cookies مع CORS
app.use(
  cors({
    origin: ["http://localhost:5173",
     'https://exclusive-e-commerce-website-t64y.vercel.app/'
    ],
     credentials: true,
  })
);

// شغل Fake DB بسيط
const users = [
  { id: 1, username: "mohamed", password: "123456", email: "mohamed@test.com" },
  { id: 2, username: "ahmed", password: "abcdef", email: "ahmed@test.com" },
  {id:3,username:'ziad mohamed badry',password:'123456',email:'a7a@gmail.com'}
];

// Middleware عشان نفك الكوكي
function authMiddleware(req, res, next) {
  const userId = req.cookies["session_user"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = users.find((u) => u.id === parseInt(userId));
  if (!user) return res.status(401).json({ message: "Invalid session" });
  req.user = user;
  next();
}

// ✅ POST /auth/login
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // حفظ session في كوكي
  res.cookie("session_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
  });

  res.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email } });
});

// ✅ POST /auth/logout
app.post("/auth/logout", (req, res) => {
  res.clearCookie("session_user");
  res.json({ message: "Logged out" });
});

// ✅ GET /auth/me
app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
// ✅ POST /auth/signup
app.post("/auth/signup", (req, res) => {
  const { username, password, email } = req.body;

  // تحقق لو اليوزر موجود قبل كده
  const existingUser = users.find(
    (u) => u.username === username || u.email === email
  );
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // اعمل id جديد
  const newUser = {
    id: users.length + 1,
    username,
    password,
    email,
  };

  users.push(newUser);

  // دخّل اليوزر على طول بعد التسجيل (زي login)
  res.cookie("session_user", newUser.id, {
    httpOnly: true,
    sameSite: "lax",
  });

  res.status(201).json({
    message: "Signup successful",
    user: { id: newUser.id, username: newUser.username, email: newUser.email },
  });
});

// Run server
app.listen(3500, () => console.log("✅ Server running on http://localhost:3500"));

