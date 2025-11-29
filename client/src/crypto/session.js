export async function generateEphemeralECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  return keyPair;
}

export async function exportEphemeralPublicKey(publicKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", publicKey);
  return jwk;
}

// --- Ephemeral key storage helpers (per conversation) ---

// Export and store the ephemeral private key (ECDH) for a given conversation.
// We store it in localStorage as JWK so we can import it later.
export async function saveEphemeralPrivateKey(conversationId, privateKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  const storageKey = `ephem_priv_${conversationId}`;
  localStorage.setItem(storageKey, JSON.stringify(jwk));
}

// Load and import the ephemeral private key (ECDH) for a given conversation.
// Returns a CryptoKey or null if not found.
export async function loadEphemeralPrivateKey(conversationId) {
  const storageKey = `ephem_priv_${conversationId}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  const jwk = JSON.parse(raw);

  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  return privateKey;
}