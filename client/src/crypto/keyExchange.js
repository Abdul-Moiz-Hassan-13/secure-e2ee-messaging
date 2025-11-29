import axios from "../api/axiosClient";
import { generateEphemeralECDHKeyPair, exportEphemeralPublicKey } from "./session";
import { loadIdentityPrivateKey, loadIdentityPublicKey } from "./loadIdentity";
import { signPayload } from "./signature";

export async function sendKeyInit(fromUserId, toUserId) {

  const identityPrivateKey = await loadIdentityPrivateKey();
  const identityPublicKey = await loadIdentityPublicKey();

  const ephemeral = await generateEphemeralECDHKeyPair();
  const ephemeralPub = await exportEphemeralPublicKey(ephemeral.publicKey);

  const payload = {
    type: "KEY_INIT",
    from: fromUserId,
    to: toUserId,
    alice_identity_public: identityPublicKey,
    alice_ephemeral_public: ephemeralPub,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 1
  };

  const signature = await signPayload(identityPrivateKey, payload);

  payload.signature = signature;

  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload
  });

  return response.data;
}
