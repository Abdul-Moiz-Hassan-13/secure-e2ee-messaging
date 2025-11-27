import mongoose from "mongoose";

const replayStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  lastSequence: { type: Number, default: 0 },
  usedNonces: { type: [String], default: [] },
});

export default mongoose.model("ReplayState", replayStateSchema);
