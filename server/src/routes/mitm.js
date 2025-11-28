import express from "express";
import crypto from "crypto";
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// Utility: base64 → Buffer
const b64ToBuf = (b64) => Buffer.from(b64, "base64");

// SIGNED ECDH DEMO (MITM detection)
router.post("/signed-ecdh", async (req, res) => {
  try {
    const { 
      clientEphemeralPublicKey,
      clientIdentityPublicKey,
      signature 
    } = req.body;

    // 🔹 Log attempt
    logSecurity(
      "SIGNED_ECDH_ATTEMPT",
      "Client initiated signed ECDH key exchange",
      null,
      { reqBody: req.body },
      req
    );

    // Missing fields validation
    if (!clientEphemeralPublicKey || !clientIdentityPublicKey || !signature) {
      logSecurity(
        "SIGNED_ECDH_INVALID_PAYLOAD",
        "Signed ECDH missing required fields",
        null,
        { reqBody: req.body },
        req
      );
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1️⃣ VERIFY SIGNATURE
    let isValid = false;
    try {
      isValid = crypto.verify(
        "sha256",
        Buffer.from(clientEphemeralPublicKey, "utf8"),
        {
          key: clientIdentityPublicKey,
          format: "pem"
        },
        b64ToBuf(signature)
      );
    } catch (err) {
      // If verify() itself fails → invalid signature
      isValid = false;
    }

    if (!isValid) {
      logSecurity(
        "INVALID_SIGNATURE",
        "Signature verification failed — MITM detected",
        null,
        { interceptedPayload: req.body },
        req
      );

      return res.status(400).json({ error: "Invalid signature — MITM detected" });
    }

    // 2️⃣ SIGNATURE IS VALID → Perform ECDH
    const serverECDH = crypto.createECDH("prime256v1");
    serverECDH.generateKeys();

    const shared = serverECDH.computeSecret(
      b64ToBuf(clientEphemeralPublicKey)
    );

    logSecurity(
      "SIGNED_ECDH_SUCCESS",
      "Signed ECDH completed successfully — MITM prevented",
      null,
      {
        clientEphemeralPublicKey,
        sharedKeyLength: shared.length
      },
      req
    );

    res.json({
      info: "Signed ECDH Success (MITM prevented)",
      serverEphemeralPublicKey: serverECDH.getPublicKey().toString("base64"),
      sharedKeyLength: shared.length
    });

  } catch (err) {

    logSecurity(
      "SIGNED_ECDH_ERROR",
      "Server error during signed ECDH",
      null,
      { error: err.message, reqBody: req.body },
      req
    );

    console.error("Signed ECDH Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
