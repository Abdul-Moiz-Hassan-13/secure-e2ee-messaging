import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  eventType: { type: String, required: true },   // e.g. AUTH_SUCCESS, MITM_DETECTED
  message: { type: String, required: true },
  userId: { type: String },
  ip: { type: String },
  details: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("SecurityLog", logSchema);
