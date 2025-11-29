import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";

function generateNonce() {
  return crypto.randomUUID();
}

// NEW — replace sequenceMap with persistent local storage sequence
function getNextSequence(senderId) {
  const key = `seq_${senderId}`;
  let last = Number(localStorage.getItem(key) || 0);
  last += 1;
  localStorage.setItem(key, last);
  return last;
}

export async function sendEncryptedMessage(sessionKey, senderId, receiverId, plaintext, clientTimestamp) {
  const { ciphertext, iv } = await encryptMessage(sessionKey, plaintext);

  const nonce = generateNonce();
  const sequenceNumber = getNextSequence(senderId);   // NEW

  const response = await axiosClient.post("/messages/send", {
    senderId,
    receiverId,
    ciphertext,
    iv,
    nonce,
    sequenceNumber,
    clientTimestamp        // NEW
  });

  return response.data;
}
