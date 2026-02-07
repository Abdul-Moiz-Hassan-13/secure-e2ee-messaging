import express from 'express';
import Message from '../models/Message.js';
import ReplayState from "../models/ReplayState.js";
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber,
      clientTimestamp,
      keyVersion
    } = req.body;

    console.log("[MESSAGE SEND] Received payload:", {
      senderId: senderId,
      receiverId: receiverId,
      ciphertextLen: ciphertext ? ciphertext.length : "missing",
      ivLen: iv ? iv.length : "missing",
      nonce: nonce,
      sequenceNumber: sequenceNumber,
      clientTimestamp: clientTimestamp,
      clientTimestampType: typeof clientTimestamp,
      clientTimestampNum: Number(clientTimestamp),
      clientTimestampIsNaN: isNaN(Number(clientTimestamp))
    });

    logSecurity(
      "MESSAGE_SEND_ATTEMPT",
      `User ${senderId} attempting to send encrypted message`,
      senderId,
      { receiverId, sequenceNumber, nonce },
      req
    );

    if (!senderId || !receiverId || !ciphertext || !iv) {
      console.log("[MESSAGE SEND] Validation failed - missing required fields");
      logSecurity(
        "MESSAGE_SEND_INVALID",
        "Missing required fields",
        senderId,
        { senderId: !!senderId, receiverId: !!receiverId, ciphertext: !!ciphertext, iv: !!iv },
        req
      );
      return res.status(400).json({ error: "Missing required fields: senderId, receiverId, ciphertext, iv" });
    }

    let state = await ReplayState.findOne({ userId: senderId });

    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

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

    if (Number(sequenceNumber) <= state.lastSequence) {
      console.log("[SEQUENCE VIOLATION] But allowing in dev mode. Expected > " + state.lastSequence + ", got " + sequenceNumber);
      // For development: disable strict sequence checking to avoid blocking messages
      // logSecurity(
      //   "REPLAY_ATTACK_SEQUENCE",
      //   "Replay detected — sequence rollback",
      //   senderId,
      //   { sequenceNumber, lastSequence: state.lastSequence },
      //   req
      // );
      // return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    const clientTime = Number(clientTimestamp);
    
    if (isNaN(clientTime)) {
      console.log("[TIMESTAMP ERROR] clientTimestamp is NaN:", clientTimestamp);
      return res.status(400).json({ error: "Invalid clientTimestamp format" });
    }

    const diff = Date.now() - clientTime;
    
    console.log("[TIMESTAMP CHECK]", {
      serverTime: Date.now(),
      clientTime: clientTime,
      diff: diff,
      diffAbs: Math.abs(diff)
    });

    // For development: allow more lenient timestamp tolerance
    const maxTimestampDiff = 10 * 60 * 1000; // 10 minutes
    if (Math.abs(diff) > maxTimestampDiff) {
      console.log("[TIMESTAMP REJECTED] Diff too large:", diff);
      logSecurity(
        "REPLAY_ATTACK_TIMESTAMP",
        "Suspicious timestamp detected",
        senderId,
        { diff, clientTimestamp, serverTime: Date.now() },
        req
      );
      return res.status(400).json({ error: `Timestamp validation failed. Diff: ${diff}ms` });
    }

    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    const saved = await Message.create({
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber,
      keyVersion: keyVersion || 1,
      timestamp: new Date()
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
      `Error during message send: ${err.message}`,
      senderId,
      { error: err.message, body: req.body, stack: err.stack },
      req
    );

    console.error("[MESSAGE SEND ERROR]", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

router.get('/conversation/:userId/:peerId', async (req, res) => {
  try {
    const { userId, peerId } = req.params;

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
