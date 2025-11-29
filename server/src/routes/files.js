import express from "express";
import FileRecord from "../models/FileRecord.js";
import ReplayState from "../models/ReplayState.js";
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// ✅ REMOVED multer - we receive encrypted data as JSON
router.post("/upload", async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      filename,
      ciphertext,  // Encrypted data as base64 string
      iv,
      nonce,
      sequenceNumber
    } = req.body;

    logSecurity(
      "FILE_UPLOAD_ATTEMPT",
      `User ${senderId} uploading encrypted file`,
      senderId,
      { receiverId, filename, sequenceNumber, nonce },
      req
    );

    // ✅ Validate encrypted data exists
    if (!ciphertext) {
      return res.status(400).json({ error: "Missing encrypted file data" });
    }

    // ✅ Convert base64 to buffer for storage
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');

    // Replay protection (your existing code)
    let state = await ReplayState.findOne({ userId: senderId });
    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

    if (state.usedNonces.includes(nonce)) {
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    if (Number(sequenceNumber) <= state.lastSequence) {
      return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    // ✅ Store ENCRYPTED data
    const saved = await FileRecord.create({
      senderId,
      receiverId,
      filename,
      encryptedFile: encryptedBuffer,
      iv,
      nonce,
      sequenceNumber,
    });

    res.json({ message: "Encrypted file stored", id: saved._id });

  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Keep your download endpoint as-is
router.get("/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = await FileRecord.findById(fileId);

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      filename: fileRecord.filename,
      ciphertext: fileRecord.encryptedFile.toString("base64"),
      iv: fileRecord.iv,
      mimeType: "application/octet-stream"
    });

  } catch (err) {
    console.error("File download error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;