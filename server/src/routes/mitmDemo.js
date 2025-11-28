import express from "express";
import crypto from "crypto";

const router = express.Router();

// VULNERABLE: DH key exchange WITHOUT signatures
router.post("/dh", (req, res) => {
  try {
    const { clientPublicKey } = req.body;

    // Server generates DH keys
    const serverDH = crypto.createDiffieHellman(2048);
    const serverPublicKey = serverDH.generateKeys();

    const shared = serverDH.computeSecret(Buffer.from(clientPublicKey, "base64"));

    // Respond with PUBLIC KEY ONLY (vulnerable)
    res.json({
      serverPublicKey: serverPublicKey.toString("base64"),
      info: "INSECURE DEMO DH — SUBJECT TO MITM"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Demo DH error" });
  }
});

export default router;
