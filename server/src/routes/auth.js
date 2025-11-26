import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        console.log("REGISTER BODY:", req.body);
        const { username, password, publicIdentityKey } = req.body;

        // 1. Check if user exists
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // 2. Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Create the user
        const newUser = await User.create({
            username,
            passwordHash,
            publicIdentityKey
        });

        res.json({
            message: "User registered successfully",
            userId: newUser._id
        });

    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        console.log("LOGIN BODY:", req.body);

        const { username, password } = req.body;

        // 1. Find the user
        const user = await User.findOne({ username });
        console.log("FOUND USER:", user);

        if (!user) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log("PASSWORD MATCH:", isMatch);

        if (!isMatch) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        // 3. Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: "Login successful",
            token,
            userId: user._id
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
