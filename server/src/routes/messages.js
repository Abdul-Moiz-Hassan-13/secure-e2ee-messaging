import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

// =========================
// POST /api/messages/send
// =========================
router.post('/send', async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber
    } = req.body;

    const saved = await Message.create({
      senderId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      sequenceNumber
    });

    res.json({
      message: "Encrypted message stored",
      id: saved._id
    });

  } catch (err) {
    console.error("Send message error:", err);
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
