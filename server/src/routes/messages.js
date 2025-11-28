import express from 'express';
import Message from '../models/Message.js';
import ReplayState from "../models/ReplayState.js";
import { logSecurity } from "../utils/securityLogger.js";

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

    // Log initial attempt
    logSecurity(
      "MESSAGE_SEND_ATTEMPT",
      `User ${senderId} attempting to send encrypted message`,
      senderId,
      { receiverId, sequenceNumber, nonce },
      req
    );

    if (!senderId || !receiverId) {
      logSecurity(
        "MESSAGE_SEND_INVALID",
        "Missing sender or receiver ID",
        senderId,
        {},
        req
      );
      return res.status(400).json({ error: "Missing sender/receiver ID" });
    }

    // ---------------------------------------
    // 🔥 REPLAY ATTACK CHECKS + LOGGING
    // ---------------------------------------
    let state = await ReplayState.findOne({ userId: senderId });

    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

    // 1️⃣ Nonce reused
    if (state.usedNonces.includes(nonce)) {
      logSecurity(
        "REPLAY_ATTACK_NONCE",
        "Replay detected — nonce reuse",
        senderId,
        { nonce, state },
        req
      );
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    // 2️⃣ Sequence number replay/rollback
    if (Number(sequenceNumber) <= state.lastSequence) {
      logSecurity(
        "REPLAY_ATTACK_SEQUENCE",
        "Replay detected — sequence rollback",
        senderId,
        { sequenceNumber, lastSequence: state.lastSequence },
        req
      );
      return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    // 3️⃣ Timestamp check
    const diff = Date.now() - Number(clientTimestamp);

    if (Math.abs(diff) > 300000) { // > 5 min difference
      logSecurity(
        "REPLAY_ATTACK_TIMESTAMP",
        "Suspicious timestamp detected",
        senderId,
        { diff, clientTimestamp },
        req
      );
      return res.status(400).json({ error: "Timestamp replay detected" });
    }

    // Update replay state
    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    // ---------------------------------------
    // 📩 STORE ENCRYPTED MESSAGE
    // ---------------------------------------
    const saved = await Message.create({
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber
    });

    logSecurity(
      "MESSAGE_SEND_SUCCESS",
      "Encrypted message stored successfully",
      senderId,
      { messageId: saved._id, receiverId },
      req
    );

    res.json({ message: "Delivered", id: saved._id });

  } catch (err) {

    logSecurity(
      "MESSAGE_SEND_ERROR",
      "Unhandled error during send",
      null,
      { error: err.message, body: req.body },
      req
    );

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

    // Log metadata access
    logSecurity(
      "METADATA_ACCESS",
      `User ${userId} requested message metadata with ${peerId}`,
      userId,
      { peerId },
      req
    );

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 });

    logSecurity(
      "METADATA_RETURNED",
      "Message metadata returned successfully",
      userId,
      { count: messages.length },
      req
    );

    res.json(messages);

  } catch (err) {

    logSecurity(
      "METADATA_ERROR",
      "Error fetching conversation metadata",
      null,
      { error: err.message },
      req
    );

    console.error("Conversation fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
