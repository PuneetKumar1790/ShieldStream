import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import streamRoutes from "./routes/stream.js";
import refreshRoutes from "./routes/refresh.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------- CORS FIRST --------------------
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5000",
  "http://localhost:5000",
  "https://shieldstream-pcu9kqs7j-puneetkumar1790s-projects.vercel.app"
];


const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.some(
        (o) =>
          (typeof o === "string" && o === origin) ||
          (o instanceof RegExp && o.test(origin))
      )
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["set-cookie"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

app.options(/^.*$/, cors(corsOptions));

// ----------------------------------------------------
// Body + cookies
app.use(express.json());
app.use(cookieParser());

// -------------------- RATE LIMITERS --------------------

// Global limiter (light) → allows streaming chunks
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests/min per IP
  message: { error: "Too many requests, slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, try again later." },
});
app.use("/api/auth", authLimiter);
app.use("/api/refresh", authLimiter);

// Super strict for SAS key / sensitive stream endpoints
const sasLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 2,
  message: { error: "Too many key requests." },
});
app.use("/api/stream/key", sasLimiter);

// -------------------------------------------------------

app.set("trust proxy", 1);

const frontendDir = path.resolve(__dirname, "../Frontend");
app.use(express.static(frontendDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/refresh", refreshRoutes);
app.use("/api/stream", streamRoutes);

// DB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Error:", err);
  }
};

await connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
