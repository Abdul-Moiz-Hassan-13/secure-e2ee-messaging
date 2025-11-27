export async function loadIdentityKeyPair() {
  const priv = localStorage.getItem("identity_private");
  if (!priv) return null;

  const jwk = JSON.parse(priv);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
}

export async function loadPublicIdentityKey() {
  const pub = localStorage.getItem("identity_public");
  if (!pub) return null;

  const jwk = JSON.parse(pub);
  return jwk; // For identity public key, JWK form is enough
}
