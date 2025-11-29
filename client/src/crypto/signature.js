export async function signPayload(privateKey, payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));

  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    privateKey,
    encoded
  );

  return bufferToBase64Url(signature);
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuffer(b64url) {
  // Convert URL-safe base64 back to standard
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '=' to make length multiple of 4
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Verify a signed payload using the sender's public identity key (JWK).
 *
 * @param {JsonWebKey} publicJwk - sender's ECDSA public key (P-256)
 * @param {Object} payload       - the original payload WITHOUT the signature field
 * @param {string} signatureB64  - base64url-encoded signature string
 * @returns {Promise<boolean>}   - true if valid, false otherwise
 */
export async function verifyPayload(publicJwk, payload, signatureB64) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const signatureBuf = base64UrlToBuffer(signatureB64);

  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicJwk,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["verify"]
  );

  const ok = await window.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    publicKey,
    signatureBuf,
    encoded
  );

  return ok;
}