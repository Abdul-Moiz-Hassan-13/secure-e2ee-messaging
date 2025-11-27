import express from 'express';
import Message from '../models/Message.js';
import ReplayState from "../models/ReplayState.js";

const router = express.Router();

// =========================
// POST /api/messages/send
// =========================
router.post("/send", async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber,
      clientTimestamp
    } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing sender/receiver ID" });
    }

    // -------------------------
    // 🔥 REPLAY ATTACK CHECKS
    // -------------------------
    let state = await ReplayState.findOne({ userId: senderId });

    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

    // 1. Nonce reused
    if (state.usedNonces.includes(nonce)) {
      console.log("⚠ Replay detected (nonce reused)");
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    // 2. Sequence rollback or replay
    if (Number(sequenceNumber) <= state.lastSequence) {
      console.log("⚠ Replay detected (sequence rollback)");
      return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    // 3. Timestamp too old or suspicious
    const diff = Date.now() - Number(clientTimestamp);
    if (Math.abs(diff) > 300000) { 
      console.log("⚠ Suspicious timestamp detected");
      return res.status(400).json({ error: "Timestamp replay detected" });
    }

    // Update state
    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    // -------------------------
    // 📩 Store Encrypted Message
    // -------------------------
    const saved = await Message.create({
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber
    });

    res.json({ message: "Delivered", id: saved._id });

  } catch (err) {
    console.error("Message send error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// GET /api/messages/conversation/:userId/:peerId
// =========================
router.get('/conversation/:userId/:peerId', async (req, res) => {
  try {
    const { userId, peerId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 }); // ascending order

    res.json(messages);

  } catch (err) {
    console.error("Conversation fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
