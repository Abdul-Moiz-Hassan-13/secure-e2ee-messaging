import express from 'express';
import KeyExchange from '../models/KeyExchange.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// POST /api/keyexchange/init
router.post('/init', async (req, res) => {
  try {
    const { from, to, payload } = req.body;

    // 🔹 Log START of key exchange attempt
    logSecurity(
      "KEY_EXCHANGE_ATTEMPT",
      `Key exchange init attempt from ${from} to ${to}`,
      from,
      { payload },
      req
    );

    // Optional: validate required data
    if (!from || !to || !payload) {
      logSecurity(
        "KEY_EXCHANGE_INVALID_PAYLOAD",
        "Missing fields in key init request",
        from,
        { from, to, payload },
        req
      );
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔹 Save the exchange request to DB
    const saved = await KeyExchange.create({
      from,
      to,
      type: "KEY_INIT",
      payload
    });

    // 🔹 Successful key exchange init
    logSecurity(
      "KEY_EXCHANGE_SUCCESS",
      `Key exchange init stored successfully`,
      from,
      { exchangeId: saved._id, to },
      req
    );

    res.json({ message: "KEY_INIT stored", id: saved._id });

  } catch (err) {

    // 🔹 Log failure
    logSecurity(
      "KEY_EXCHANGE_ERROR",
      "Server error during key exchange init",
      null,
      { error: err.message, body: req.body },
      req
    );

    console.error("KEY_INIT error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
