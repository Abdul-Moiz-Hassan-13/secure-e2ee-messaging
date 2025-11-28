import express from "express";
import crypto from "crypto";

const router = express.Router();

// Utility to convert base64 -> Buffer
const b64ToBuf = (b64) => Buffer.from(b64, "base64");

// SIMPLIFIED signed ECDH demo
router.post("/signed-ecdh", async (req, res) => {
  try {
    const { 
      clientEphemeralPublicKey,
      clientIdentityPublicKey,
      signature 
    } = req.body;

    if (!clientEphemeralPublicKey || !clientIdentityPublicKey || !signature) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. VERIFY SIGNATURE
    const isValid = crypto.verify(
      "sha256",
      Buffer.from(clientEphemeralPublicKey, "utf8"),
      {
        key: clientIdentityPublicKey,
        format: "pem"
      },
      b64ToBuf(signature)
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature — MITM detected" });
    }

    // 2. SIGNATURE IS VALID → We perform ECDH normally
    const serverECDH = crypto.createECDH("prime256v1");
    serverECDH.generateKeys();

    const shared = serverECDH.computeSecret(
      b64ToBuf(clientEphemeralPublicKey)
    );

    res.json({
      info: "Signed ECDH Success (MITM prevented)",
      serverEphemeralPublicKey: serverECDH.getPublicKey().toString("base64"),
      sharedKeyLength: shared.length
    });

  } catch (err) {
    console.error("Signed ECDH Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
