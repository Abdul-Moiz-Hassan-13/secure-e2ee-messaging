import { generateRandomIv } from "./encryption";

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function encryptFileBuffer(sessionKey, arrayBuffer) {
  const iv = generateRandomIv();

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sessionKey,
    arrayBuffer
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encrypted),
  };
}

export async function decryptFileBuffer(sessionKey, ciphertextBase64, ivBase64) {
  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const encrypted = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sessionKey,
    encrypted
  );

  return decrypted;
}
