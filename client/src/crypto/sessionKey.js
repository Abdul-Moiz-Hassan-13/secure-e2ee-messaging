// client/src/crypto/sessionKey.js

// Build a stable conversation ID for any pair of users
// Order does not matter: convId("A", "B") === convId("B", "A")
export function buildConversationId(userIdA, userIdB) {
  const [a, b] = [String(userIdA), String(userIdB)].sort();
  return `${a}_${b}`;
}

// Small helpers for base64
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateSessionKey(myEphemeralPrivateKey, peerEphemeralPublicJwk, saltString = "") {
  // 1) Import peer's ephemeral public key
  const peerPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    peerEphemeralPublicJwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );

  // 2) Derive raw shared secret (32 bytes)
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: peerPublicKey
    },
    myEphemeralPrivateKey,
    256
  );

  // 3) HKDF → AES-256-GCM session key
  const hkdfKey = await window.crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const salt = new TextEncoder().encode(saltString);
  const info = new TextEncoder().encode("chat-session");

  const sessionKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );

  return sessionKey;
}

// Store an AES-GCM CryptoKey for a conversation in localStorage
export async function saveSessionKey(conversationId, cryptoKey) {
  // Export raw key material
  const raw = await window.crypto.subtle.exportKey("raw", cryptoKey);
  const b64 = bufToBase64(raw);

  const storageKey = `session_${conversationId}`;
  localStorage.setItem(storageKey, b64);
}

// Load an AES-GCM CryptoKey for a conversation from localStorage
export async function loadSessionKey(conversationId) {
  const storageKey = `session_${conversationId}`;
  const b64 = localStorage.getItem(storageKey);
  if (!b64) return null;

  const raw = base64ToBuf(b64);

  const key = await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}

// Convenience: get session key for a (userId, peerId) pair
export async function loadSessionKeyForUsers(userId, peerId) {
  const convId = buildConversationId(userId, peerId);
  return loadSessionKey(convId);
}
