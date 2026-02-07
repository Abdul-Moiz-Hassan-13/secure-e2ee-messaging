import express from "express";
import FileRecord from "../models/FileRecord.js";
import ReplayState from "../models/ReplayState.js";
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

router.post("/upload", async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      filename,
      ciphertext,
      iv,
      nonce
    } = req.body;

    logSecurity(
      "FILE_UPLOAD_ATTEMPT",
      `User ${senderId} uploading encrypted file`,
      senderId,
      { receiverId, filename, nonce },
      req
    );

    if (!ciphertext) {
      return res.status(400).json({ error: "Missing encrypted file data" });
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
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    state.usedNonces.push(nonce);
    await state.save();

    const saved = await FileRecord.create({
      senderId,
      receiverId,
      filename,
      encryptedFile: Buffer.from(ciphertext, 'base64'),
      iv,
      nonce,
    });

    res.json({ message: "Encrypted file stored", id: saved._id });

  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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