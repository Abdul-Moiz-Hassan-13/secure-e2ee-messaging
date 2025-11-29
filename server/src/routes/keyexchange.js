import express from 'express';
import KeyExchange from '../models/KeyExchange.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

router.post('/init', async (req, res) => {
  try {
    const { from, to, payload } = req.body;

    logSecurity(
      "KEY_EXCHANGE_ATTEMPT",
      `Key exchange init attempt from ${from} to ${to}`,
      from,
      { payload },
      req
    );

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

    const saved = await KeyExchange.create({
      from,
      to,
      type: "KEY_INIT",
      payload
    });

    logSecurity(
      "KEY_EXCHANGE_SUCCESS",
      `Key exchange init stored successfully`,
      from,
      { exchangeId: saved._id, to },
      req
    );

    res.json({ message: "KEY_INIT stored", id: saved._id });

  } catch (err) {

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

// Get the most recent KEY_INIT from `from` -> `to`
router.get('/init/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;

    logSecurity(
      "KEY_EXCHANGE_FETCH_INIT",
      `Fetching latest KEY_INIT from ${from} to ${to}`,
      null,
      { from, to },
      req
    );

    const record = await KeyExchange
      .findOne({ from, to, type: "KEY_INIT" })
      .sort({ createdAt: -1 }); // assumes timestamps on schema

    if (!record) {
      return res.status(404).json({ error: "No KEY_INIT found" });
    }

    res.json(record);

  } catch (err) {
    logSecurity(
      "KEY_EXCHANGE_FETCH_INIT_ERROR",
      "Error fetching KEY_INIT",
      null,
      { error: err.message, params: req.params },
      req
    );

    console.error("Fetch KEY_INIT error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Store a KEY_CONFIRM message (e.g., from Bob back to Alice)
router.post('/confirm', async (req, res) => {
  try {
    const { from, to, payload } = req.body;

    logSecurity(
      "KEY_EXCHANGE_CONFIRM_ATTEMPT",
      `Key exchange confirm from ${from} to ${to}`,
      from,
      { payload },
      req
    );

    if (!from || !to || !payload) {
      logSecurity(
        "KEY_EXCHANGE_CONFIRM_INVALID",
        "Missing fields in key confirm request",
        from,
        { from, to, payload },
        req
      );
      return res.status(400).json({ error: "Missing required fields" });
    }

    const saved = await KeyExchange.create({
      from,
      to,
      type: "KEY_CONFIRM",
      payload
    });

    logSecurity(
      "KEY_EXCHANGE_CONFIRM_SUCCESS",
      `Key exchange confirm stored successfully`,
      from,
      { exchangeId: saved._id, to },
      req
    );

    res.json({ message: "KEY_CONFIRM stored", id: saved._id });

  } catch (err) {
    logSecurity(
      "KEY_EXCHANGE_CONFIRM_ERROR",
      "Server error during key exchange confirm",
      null,
      { error: err.message, body: req.body },
      req
    );

    console.error("KEY_CONFIRM error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get the most recent KEY_CONFIRM from `from` -> `to`
router.get('/confirm/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;

    logSecurity(
      "KEY_EXCHANGE_FETCH_CONFIRM",
      `Fetching latest KEY_CONFIRM from ${from} to ${to}`,
      null,
      { from, to },
      req
    );

    const record = await KeyExchange
      .findOne({ from, to, type: "KEY_CONFIRM" })
      .sort({ createdAt: -1 });

    if (!record) {
      return res.status(404).json({ error: "No KEY_CONFIRM found" });
    }

    res.json(record);

  } catch (err) {
    logSecurity(
      "KEY_EXCHANGE_FETCH_CONFIRM_ERROR",
      "Error fetching KEY_CONFIRM",
      null,
      { error: err.message, params: req.params },
      req
    );

    console.error("Fetch KEY_CONFIRM error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
