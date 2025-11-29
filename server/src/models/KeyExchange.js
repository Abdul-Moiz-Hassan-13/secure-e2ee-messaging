import mongoose from 'mongoose';

const keyExchangeSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },

  type: { type: String, required: true },

  payload: { type: Object, required: true },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("KeyExchange", keyExchangeSchema);
