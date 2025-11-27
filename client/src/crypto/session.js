// Generate an ephemeral ECDH key pair (P-256)
export async function generateEphemeralECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true, // extractable (we'll need to export public key)
    ["deriveKey", "deriveBits"]
  );

  return keyPair;
}

// Export ECDH public key to JWK for sending in KEY_INIT / KEY_RESPONSE
export async function exportEphemeralPublicKey(publicKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", publicKey);
  return jwk;
}
