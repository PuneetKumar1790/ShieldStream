import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserById,
  findUserOne,
  getUserFields,
  saveUser,
} from "../lib/memoryDb.js";
const router = Router();
import verifyToken from "../middlewares/auth.js";

// Sign UP route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be atleast 6 characters long " });
    }

    //Checking existing user
    const existingUser = await findUserOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    //Hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //Save user
    await createUser({ username, email, password: hashedPassword });
    res.status(201).json({ msg: "Signup successful" });
  } catch (error) {
    res.status(500).json({ msg: "Signup error", error: error.message });
  }
});

//Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    //find user
    const user = await findUserOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }
    //Check pswrd
    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) return res.status(400).json({ msg: "Invalid credentials" });

    //Genertae tokens
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_EXPIRES_IN }
    );

    //Save new refresh token in DB
    user.refreshToken = refreshToken;
    await saveUser(user);

    //Send refresh token in cookies
    const isProduction = process.env.NODE_ENV === "production";
    const isCrossOrigin = req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`;
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction || isCrossOrigin, // true in production or cross-origin (HTTPS), false in development
      sameSite: (isProduction || isCrossOrigin) ? "None" : "Lax", // None for cross-origin, Lax for same-origin
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(200).json({ msg: "Login successful" });
  } catch (error) {
    console.error("Login error :", error);
    res.status(500).json({ msg: "Login failed", error: error.message });
  }
});

//Log out route
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(204).json({ msg: "No refresh token in browser" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await findUserById(decoded.id);
    if (!user) return res.status(204).json({ msg: "User not present" });
    user.refreshToken = null; //token changed to null in db
    await saveUser(user);

    const isProduction = process.env.NODE_ENV === "production";
    const isCrossOrigin = req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`;
    
    const clearCookieOptions = {
      httpOnly: true,
      secure: isProduction || isCrossOrigin,
      sameSite: (isProduction || isCrossOrigin) ? "None" : "Lax",
    };

    res.clearCookie("refreshToken", clearCookieOptions);
    res.clearCookie("accessToken", clearCookieOptions);

    res.json({ msg: "Logged out" });
  } catch (error) {
    console.error("Logout error", error.message);
    res.status(500).json({ msg: "Log out failed", error: error.message });
  }
});

//get current user info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = getUserFields(await findUserById(req.user.id), ["username", "email"]);

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ msg: "You are verified", user });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

export default router;
