import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ActiveSession from '../models/ActiveSession.js';
import Message from '../models/Message.js';
import KeyExchange from '../models/KeyExchange.js';
import ReplayState from '../models/ReplayState.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

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

        const passwordHash = await bcrypt.hash(password, 10);

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

        // Create or update active session
        await ActiveSession.findOneAndUpdate(
            { userId: user._id.toString() },
            { 
                userId: user._id.toString(), 
                token, 
                lastActivity: new Date() 
            },
            { upsert: true, new: true }
        );

        res.json({
            message: "Login successful",
            token,
            userId: user._id,
            username: user.username
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

// Helper function to perform logout cleanup for a user
async function performLogoutCleanup(userIdStr) {
    // 1. Remove active session
    await ActiveSession.deleteOne({ userId: userIdStr });

    // 2. Delete all messages where user is sender or receiver (perfect forward secrecy)
    const deletedMessages = await Message.deleteMany({
        $or: [
            { senderId: userIdStr },
            { receiverId: userIdStr }
        ]
    });

    // 3. Delete all key exchange records involving this user
    const deletedKeyExchanges = await KeyExchange.deleteMany({
        $or: [
            { from: userIdStr },
            { to: userIdStr }
        ]
    });

    // 4. Delete replay protection state for this user
    await ReplayState.deleteOne({ userId: userIdStr });

    return { deletedMessages, deletedKeyExchanges };
}

// Logout endpoint - removes active session and all conversation history
// If peerId is provided, also logs out the peer user
router.post('/logout', async (req, res) => {
    try {
        const { userId, peerId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const userIdStr = userId.toString();
        const peerIdStr = peerId ? peerId.toString() : null;

        // Logout the main user
        const { deletedMessages, deletedKeyExchanges } = await performLogoutCleanup(userIdStr);

        console.log(`[LOGOUT CLEANUP] User ${userIdStr}:`, {
            messagesDeleted: deletedMessages.deletedCount,
            keyExchangesDeleted: deletedKeyExchanges.deletedCount
        });

        // If there's a peer user, logout them too
        if (peerIdStr && peerIdStr !== userIdStr) {
            await performLogoutCleanup(peerIdStr);
            console.log(`[PEER LOGOUT] Also logged out peer user: ${peerIdStr}`);
        }

        logSecurity(
            "AUTH_LOGOUT",
            `User logged out - all conversation history cleared${peerIdStr ? ` (peer also logged out)` : ''}`,
            userId,
            { 
                messagesDeleted: deletedMessages.deletedCount,
                keyExchangesDeleted: deletedKeyExchanges.deletedCount,
                peerId: peerIdStr
            },
            req
        );

        res.json({ 
            message: "Logged out successfully",
            messagesDeleted: deletedMessages.deletedCount,
            keyExchangesDeleted: deletedKeyExchanges.deletedCount,
            peerLoggedOut: !!peerIdStr
        });

    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Check if user has active session
router.get('/session/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const session = await ActiveSession.findOne({ userId: userId.toString() });

        res.json({ 
            active: !!session,
            lastActivity: session?.lastActivity 
        });

    } catch (err) {
        console.error("Session check error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
