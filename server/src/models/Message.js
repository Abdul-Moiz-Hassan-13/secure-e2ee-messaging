import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {senderId: { type: String, required: true },
  receiverId: { type: String, required: true },

  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },

  nonce: { type: String, required: true },
  sequenceNumber: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Message", messageSchema);
