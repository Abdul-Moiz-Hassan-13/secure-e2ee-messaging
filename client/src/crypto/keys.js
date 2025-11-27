// Generate ECC P-256 key pair for identity (sign/verify)
export async function generateIdentityKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["sign", "verify"]
  );
}

// Export JWK from public key
export async function exportPublicKey(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

// Save both keys locally (private key stays on client)
export async function saveIdentityKeyPair(keyPair) {
  const privJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const pubJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

  localStorage.setItem("identity_private", JSON.stringify(privJwk));
  localStorage.setItem("identity_public", JSON.stringify(pubJwk));
}
