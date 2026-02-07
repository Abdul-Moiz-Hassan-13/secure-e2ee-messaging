export function buildConversationId(userIdA, userIdB) {
  const [a, b] = [String(userIdA), String(userIdB)].sort();
  return `${a}_${b}`;
}

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
  console.log("generateSessionKey called with:", {
    saltString,
    peerEphemeralPublicJwk: peerEphemeralPublicJwk?.x?.substring(0, 10) + "..."
  });

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

  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: peerPublicKey
    },
    myEphemeralPrivateKey,
    256
  );

  const hkdfKey = await window.crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const salt = new TextEncoder().encode(saltString + "-session-key");
  const info = new TextEncoder().encode("chat-session-v1");

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

  const exportedKey = await window.crypto.subtle.exportKey("raw", sessionKey);
  const keyB64 = bufToBase64(exportedKey);
  console.log("Generated session key:", keyB64);

  return sessionKey;
}

export async function saveSessionKey(conversationId, cryptoKey) {
  const raw = await window.crypto.subtle.exportKey("raw", cryptoKey);
  const b64 = bufToBase64(raw);

  const storageKey = `session_${conversationId}`;
  localStorage.setItem(storageKey, b64);
}

export async function loadSessionKey(conversationId) {
  const storageKey = `session_${conversationId}`;
  const b64 = localStorage.getItem(storageKey);
  if (!b64) return null;

  const raw = base64ToBuf(b64);

  const key = await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    true,  // Changed to true to allow key export for debugging/logging
    ["encrypt", "decrypt"]
  );

  return key;
}

export async function loadSessionKeyForUsers(userId, peerId) {
  const convId = buildConversationId(userId, peerId);
  return loadSessionKey(convId);
}

// Derive a PERSISTENT key from identity keys for backward compatibility
// Use this as fallback for old messages when ephemeral session key fails
export async function derivePersistentSessionKey(myUserId, peerUserId, myIdentityPublicJwk, peerIdentityPublicJwk) {
  const convId = buildConversationId(myUserId, peerUserId);
  const storageKey = `persistent_session_${convId}`;
  
  // Check cache first
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    console.log("[Persistent Key] Using cached persistent session key");
    const raw = base64ToBuf(cached);
    const key = await window.crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      true,  // Allow export for debugging
      ["encrypt", "decrypt"]
    );
    return key;
  }

  try {
    // Import both identity public keys
    const keyA = await window.crypto.subtle.importKey(
      "jwk",
      myIdentityPublicJwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      []
    );

    const keyB = await window.crypto.subtle.importKey(
      "jwk",
      peerIdentityPublicJwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      []
    );

    // Deterministic ordering for consistent key on both sides
    const [firstId, secondId] = [String(myUserId), String(peerUserId)].sort();
    const [firstKey, secondKey] = 
      firstId === String(myUserId) ? [keyA, keyB] : [keyB, keyA];

    // Derive shared secret (this won't work since both are public keys)
    // Instead, use deterministic HKDF from sorted public key material
    const keyAraw = await window.crypto.subtle.exportKey("raw", keyA);
    const keyBraw = await window.crypto.subtle.exportKey("raw", keyB);
    
    // Combine in sorted order for determinism
    const combined = new Uint8Array([
      ...new Uint8Array(firstId === String(myUserId) ? keyAraw : keyBraw),
      ...new Uint8Array(firstId === String(myUserId) ? keyBraw : keyAraw)
    ]);

    const hkdfKey = await window.crypto.subtle.importKey(
      "raw",
      combined,
      "HKDF",
      false,
      ["deriveKey"]
    );

    const salt = new TextEncoder().encode(`${convId}-persistent`);
    const info = new TextEncoder().encode("persistent-session-key-v1");

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

    // Cache it
    const raw = await window.crypto.subtle.exportKey("raw", sessionKey);
    const b64 = bufToBase64(raw);
    localStorage.setItem(storageKey, b64);
    
    console.log("[Persistent Key] Generated and cached new persistent session key");
    return sessionKey;

  } catch (err) {
    console.error("Failed to derive persistent session key:", err);
    return null;
  }
}
