import express from "express";
import multer from "multer";
import FileRecord from "../models/FileRecord.js";
import ReplayState from "../models/ReplayState.js";
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// Multer storage in memory — suitable for encrypted files
const upload = multer({ storage: multer.memoryStorage() });

// ===========================
// POST /api/files/upload
// ===========================
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      filename,
      iv,
      nonce,
      sequenceNumber
    } = req.body;

    // Log initial file upload attempt
    logSecurity(
      "FILE_UPLOAD_ATTEMPT",
      `User ${senderId} uploading encrypted file`,
      senderId,
      { receiverId, filename, sequenceNumber, nonce },
      req
    );

    if (!req.file) {
      logSecurity(
        "FILE_UPLOAD_INVALID",
        "Missing encrypted file in upload request",
        senderId,
        {},
        req
      );
      return res.status(400).json({ error: "Missing encrypted file" });
    }

    // -------------------------
    // 🔥 REPLAY ATTACK CHECKS
    // -------------------------
    let state = await ReplayState.findOne({ userId: senderId });

    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

    // 1️⃣ Nonce reused
    if (state.usedNonces.includes(nonce)) {
      logSecurity(
        "REPLAY_ATTACK_NONCE",
        "File upload replay detected — nonce reused",
        senderId,
        { nonce },
        req
      );
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    // 2️⃣ Sequence regression
    if (Number(sequenceNumber) <= state.lastSequence) {
      logSecurity(
        "REPLAY_ATTACK_SEQUENCE",
        "File upload replay detected — sequence rollback",
        senderId,
        { sequenceNumber, lastSequence: state.lastSequence },
        req
      );
      return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    // Update state
    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    // -------------------------
    // 📁 Save encrypted file
    // -------------------------
    const encryptedBuffer = req.file.buffer;

    const saved = await FileRecord.create({
      senderId,
      receiverId,
      filename,
      encryptedFile: encryptedBuffer,
      iv,
      nonce,
      sequenceNumber,
    });

    logSecurity(
      "FILE_UPLOAD_SUCCESS",
      `Encrypted file stored successfully`,
      senderId,
      { fileId: saved._id, receiverId },
      req
    );

    res.json({ message: "Encrypted file stored", id: saved._id });

  } catch (err) {

    logSecurity(
      "FILE_UPLOAD_ERROR",
      "Unhandled error during file upload",
      null,
      { error: err.message, body: req.body },
      req
    );

    console.error("File upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===========================
// GET /api/files/download/:id
// ===========================
router.get("/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id;

    logSecurity(
      "FILE_DOWNLOAD_ATTEMPT",
      `Attempt to download encrypted file`,
      null,
      { fileId },
      req
    );

    const fileRecord = await FileRecord.findById(fileId);

    if (!fileRecord) {
      logSecurity(
        "FILE_NOT_FOUND",
        `Requested file does not exist`,
        null,
        { fileId },
        req
      );
      return res.status(404).json({ error: "File not found" });
    }

    logSecurity(
      "FILE_METADATA_RETURNED",
      `Returning encrypted file metadata`,
      fileRecord.receiverId,
      { fileId },
      req
    );

    res.json({
      filename: fileRecord.filename,
      ciphertext: fileRecord.encryptedFile.toString("base64"),
      iv: fileRecord.iv,
      nonce: fileRecord.nonce,
      sequenceNumber: fileRecord.sequenceNumber,
      mimeType: "application/octet-stream"
    });

  } catch (err) {

    logSecurity(
      "FILE_DOWNLOAD_ERROR",
      "Unhandled error during file download",
      null,
      { error: err.message, fileId: req.params.id },
      req
    );

    console.error("File download error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
