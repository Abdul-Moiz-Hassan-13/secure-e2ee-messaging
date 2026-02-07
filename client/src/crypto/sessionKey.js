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
  console.log("[SESSION KEY] Generated key (first 20 chars):", keyB64.substring(0, 20));
  console.log("[SESSION KEY] Salt used:", saltString);

  return sessionKey;
}

export async function saveSessionKey(conversationId, cryptoKey) {
  const raw = await window.crypto.subtle.exportKey("raw", cryptoKey);
  const b64 = bufToBase64(raw);

  const storageKey = `session_${conversationId}`;
  localStorage.setItem(storageKey, b64);
  
  // Get current version (defaults to 0 if not set)
  let currentVersion = Number(localStorage.getItem(`key_version_${conversationId}`) || 0);
  const newVersion = currentVersion + 1;
  
  // Save to history before updating current
  await saveKeyToHistory(conversationId, cryptoKey, newVersion);
  
  // Update current version
  await saveKeyVersion(conversationId, newVersion);
  
  console.log(`[KEY VERSIONING] Ephemeral key saved as version ${newVersion}`);
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

export async function getCurrentKeyVersion(convId) {
  const versionKey = `key_version_${convId}`;
  return Number(localStorage.getItem(versionKey) || 1);
}

export async function getKeyHistory(convId) {
  const historyKey = `key_history_${convId}`;
  const history = localStorage.getItem(historyKey);
  return history ? JSON.parse(history) : [];
}

export async function saveKeyVersion(convId, version) {
  const versionKey = `key_version_${convId}`;
  localStorage.setItem(versionKey, version.toString());
}

export async function saveKeyToHistory(convId, sessionKey, version) {
  const raw = await window.crypto.subtle.exportKey("raw", sessionKey);
  const b64 = bufToBase64(raw);
  
  const historyKey = `key_history_${convId}`;
  let history = JSON.parse(localStorage.getItem(historyKey) || "[]");
  
  // Add new version
  history.push({
    version: version,
    key: b64,
    timestamp: Date.now()
  });
  
  // Keep last 10 versions for fallback
  if (history.length > 10) {
    history = history.slice(-10);
  }
  
  localStorage.setItem(historyKey, JSON.stringify(history));
}

export async function loadSessionKeyByVersion(convId, version) {
  const currentVer = await getCurrentKeyVersion(convId);
  
  // If requesting current version, load from current storage
  if (version === currentVer) {
    return loadSessionKey(convId);
  }
  
  // Try to load from history
  const history = await getKeyHistory(convId);
  const entry = history.find(e => e.version === version);
  
  if (entry) {
    const raw = base64ToBuf(entry.key);
    const key = await window.crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
    console.log(`[KEY VERSIONING] Loaded key version ${version} from history`);
    return key;
  }
  
  console.log(`[KEY VERSIONING] Key version ${version} not found (current: ${currentVer})`);
  return null;
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
    console.log("[Persistent Key] Deriving new persistent session key from identity keys");
    
    // Sort user IDs for deterministic ordering
    const [firstId, secondId] = [String(myUserId), String(peerUserId)].sort();
    const [firstKey, secondKey] = 
      firstId === String(myUserId) 
        ? [myIdentityPublicJwk, peerIdentityPublicJwk] 
        : [peerIdentityPublicJwk, myIdentityPublicJwk];

    // Convert JWK public keys to raw bytes
    const key1Crypto = await window.crypto.subtle.importKey(
      "jwk",
      firstKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      []
    );
    const key2Crypto = await window.crypto.subtle.importKey(
      "jwk",
      secondKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      []
    );
    
    const key1raw = await window.crypto.subtle.exportKey("raw", key1Crypto);
    const key2raw = await window.crypto.subtle.exportKey("raw", key2Crypto);
    
    // Combine in sorted order for determinism
    const combined = new Uint8Array([
      ...new Uint8Array(key1raw),
      ...new Uint8Array(key2raw)
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
    throw err;
  }
}
