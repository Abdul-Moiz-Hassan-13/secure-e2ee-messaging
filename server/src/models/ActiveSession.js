import mongoose from "mongoose";

const activeSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    lastActivity: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("ActiveSession", activeSessionSchema);
