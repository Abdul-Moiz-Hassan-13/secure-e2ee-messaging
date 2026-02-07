import express from 'express';
import KeyExchange from '../models/KeyExchange.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

router.post('/init', async (req, res) => {
  try {
    const { from, to, payload } = req.body;

    console.log("[DEBUG] KEY_INIT RECEIVED:");
    console.log("From:", from, "To:", to);
    console.log("Ephemeral Key X (first 30 chars):", payload.alice_ephemeral_public?.x?.substring(0, 30));
    console.log("Ephemeral Key Y (first 30 chars):", payload.alice_ephemeral_public?.y?.substring(0, 30));
    console.log("Full Key Structure:", JSON.stringify(payload.alice_ephemeral_public).substring(0, 200) + "...");

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

router.get('/init/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;

    console.log("[BACKEND DEBUG] Fetching KEY_INIT from:", from, "to:", to);

    logSecurity(
      "KEY_EXCHANGE_FETCH_INIT",
      `Fetching latest KEY_INIT from ${from} to ${to}`,
      null,
      { from, to },
      req
    );

    const record = await KeyExchange
      .findOne({ from, to, type: "KEY_INIT" })
      .sort({ createdAt: -1 });

    if (!record) {
      return res.status(404).json({ error: "No KEY_INIT found" });
    }

    console.log("Created at:", record.createdAt);

    console.log("[DEBUG] KEY_INIT SENDING:");
    console.log("From:", from, "To:", to);
    console.log("Ephemeral Key X (first 30 chars):", record.payload.alice_ephemeral_public?.x?.substring(0, 30));
    console.log("Ephemeral Key Y (first 30 chars):", record.payload.alice_ephemeral_public?.y?.substring(0, 30));
    console.log("Full Key Structure:", JSON.stringify(record.payload.alice_ephemeral_public).substring(0, 200) + "...");

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

router.post('/debug-key-transmission', async (req, res) => {
  try {
    const { originalKey } = req.body;
    
    console.log("[DEBUG TEST] ORIGINAL KEY RECEIVED:");
    console.log("X:", originalKey.x?.substring(0, 30));
    console.log("Y:", originalKey.y?.substring(0, 30));
    console.log("Full X length:", originalKey.x?.length);
    console.log("Full Y length:", originalKey.y?.length);

    const stored = await KeyExchange.create({
      from: 'debug-from',
      to: 'debug-to', 
      type: 'DEBUG_TEST',
      payload: { testKey: originalKey }
    });

    console.log("[DEBUG TEST] Key stored in database");

    const retrieved = await KeyExchange.findById(stored._id);
    
    console.log("[DEBUG TEST] KEY RETRIEVED FROM DATABASE:");
    console.log("X:", retrieved.payload.testKey.x?.substring(0, 30));
    console.log("Y:", retrieved.payload.testKey.y?.substring(0, 30));
    console.log("Full X length:", retrieved.payload.testKey.x?.length);
    console.log("Full Y length:", retrieved.payload.testKey.y?.length);

    const keysMatch = JSON.stringify(originalKey) === JSON.stringify(retrieved.payload.testKey);
    console.log("[DEBUG TEST] Keys match:", keysMatch);

    if (!keysMatch) {
      console.log("[DEBUG TEST] KEYS DO NOT MATCH!");
      console.log("Original:", JSON.stringify(originalKey));
      console.log("Retrieved:", JSON.stringify(retrieved.payload.testKey));
    }

    res.json({ 
      success: true,
      keysMatch: keysMatch,
      originalKey: originalKey,
      retrievedKey: retrieved.payload.testKey
    });

  } catch (err) {
    console.error("[DEBUG TEST] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
