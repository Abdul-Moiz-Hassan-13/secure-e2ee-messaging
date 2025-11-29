import mongoose from "mongoose";

const fileRecordSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },

  filename: { type: String, required: true },

  // encrypted binary
  encryptedFile: { type: Buffer, required: true },
  iv: { type: String, required: true },

  // replay protection
  nonce: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("FileRecord", fileRecordSchema);
