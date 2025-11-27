import mongoose from 'mongoose';

const keyExchangeSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },

  type: { type: String, required: true }, // KEY_INIT, KEY_RESPONSE, KEY_CONFIRM

  payload: { type: Object, required: true }, // Contains public keys, signatures, timestamps, etc.

  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("KeyExchange", keyExchangeSchema);
