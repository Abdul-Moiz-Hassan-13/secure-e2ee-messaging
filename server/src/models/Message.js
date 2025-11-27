import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  receiverId: {
    type: String,
    required: true
  },

  // Encrypted content
  ciphertext: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },

  // Replay protection
  nonce: {
    type: String,
    required: true
  },
  sequenceNumber: {
    type: Number,
    required: true
  },

  // Metadata
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Message', messageSchema);
