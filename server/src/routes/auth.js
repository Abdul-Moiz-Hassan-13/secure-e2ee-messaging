import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        logSecurity(
            "AUTH_REGISTER_ATTEMPT",
            `Registration attempt for username: ${req.body.username}`,
            null,
            { body: req.body },
            req
        );

        const { username, password, publicIdentityKey } = req.body;

        // 1. Check if user exists
        const existing = await User.findOne({ username });
        if (existing) {

            logSecurity(
                "AUTH_REGISTER_FAILED",
                `Username already taken: ${username}`,
                null,
                {},
                req
            );

            return res.status(400).json({ error: "Username already taken" });
        }

        // 2. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Create user
        const newUser = await User.create({
            username,
            passwordHash,
            publicIdentityKey
        });

        logSecurity(
            "AUTH_REGISTER_SUCCESS",
            `User registered successfully`,
            newUser._id,
            {},
            req
        );

        res.json({
            message: "User registered successfully",
            userId: newUser._id
        });

    } catch (err) {
        logSecurity(
            "AUTH_REGISTER_ERROR",
            `Server error during registration`,
            null,
            { error: err.message },
            req
        );

        console.error("Registration error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {

        logSecurity(
            "AUTH_LOGIN_ATTEMPT",
            `Login attempt for username: ${req.body.username}`,
            null,
            {},
            req
        );

        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {

            logSecurity(
                "AUTH_LOGIN_FAILED",
                `Invalid username: ${username}`,
                null,
                {},
                req
            );

            return res.status(400).json({ error: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {

            logSecurity(
                "AUTH_LOGIN_FAILED",
                `Wrong password for username: ${username}`,
                user._id,
                {},
                req
            );

            return res.status(400).json({ error: "Invalid username or password" });
        }

        // 3. Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        logSecurity(
            "AUTH_LOGIN_SUCCESS",
            `User logged in successfully`,
            user._id,
            {},
            req
        );

        res.json({
            message: "Login successful",
            token,
            userId: user._id
        });

    } catch (err) {

        logSecurity(
            "AUTH_LOGIN_ERROR",
            `Server error during login`,
            null,
            { error: err.message },
            req
        );

        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
