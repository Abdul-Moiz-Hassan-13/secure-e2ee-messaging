import axios from "../api/axiosClient";
import {
  generateEphemeralECDHKeyPair,
  exportEphemeralPublicKey,
  saveEphemeralPrivateKey,          // <-- NEW
} from "./session";
import { loadIdentityKeyPair, loadPublicIdentityKey } from "./loadIdentity"; // we'll tweak names below
import { signPayload } from "./signature";
import { buildConversationId } from "./sessionKey"; 

export async function sendKeyInit(fromUserId, toUserId) {
  // 1) Load identity keys (ECDSA)
  const identityPrivateKey = await loadIdentityKeyPair();   // signing key
  const identityPublicJwk = await loadPublicIdentityKey();  // public JWK

  if (!identityPrivateKey || !identityPublicJwk) {
    throw new Error("Identity keys not found. Make sure user is registered on this device.");
  }

  // 2) Generate ephemeral ECDH key pair for this conversation
  const ephemeral = await generateEphemeralECDHKeyPair();
  const ephemeralPubJwk = await exportEphemeralPublicKey(ephemeral.publicKey);

  // 3) Build a stable conversation ID and store the ephemeral private key
  const conversationId = buildConversationId(fromUserId, toUserId);
  await saveEphemeralPrivateKey(conversationId, ephemeral.privateKey);

  // 4) Build the signed KEY_INIT payload
  const payload = {
    type: "KEY_INIT",
    from: fromUserId,
    to: toUserId,
    alice_identity_public: identityPublicJwk,
    alice_ephemeral_public: ephemeralPubJwk,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 1
  };

  const signature = await signPayload(identityPrivateKey, payload);

  payload.signature = signature;

  // 5) Send to backend keyexchange route
  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload
  });

  return response.data;
}
