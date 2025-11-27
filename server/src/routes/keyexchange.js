import express from 'express';
import KeyExchange from '../models/KeyExchange.js';

const router = express.Router();

// POST /api/keyexchange/init
router.post('/init', async (req, res) => {
  try {
    const { from, to, payload } = req.body;

    const saved = await KeyExchange.create({
      from,
      to,
      type: "KEY_INIT",
      payload
    });

    res.json({ message: "KEY_INIT stored", id: saved._id });
  } catch (err) {
    console.error("KEY_INIT error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
