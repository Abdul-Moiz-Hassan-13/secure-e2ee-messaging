import axios from "../api/axiosClient";
import { generateEphemeralECDHKeyPair, exportEphemeralPublicKey } from "./session";
import { loadIdentityPrivateKey, loadIdentityPublicKey } from "./loadIdentity";
import { signPayload } from "./signature";

export async function sendKeyInit(fromUserId, toUserId) {
  // 1. Load identity keys
  const identityPrivateKey = await loadIdentityPrivateKey();
  const identityPublicKey = await loadIdentityPublicKey();

  // 2. Generate ephemeral ECDH keypair
  const ephemeral = await generateEphemeralECDHKeyPair();
  const ephemeralPub = await exportEphemeralPublicKey(ephemeral.publicKey);

  // 3. Create unsigned payload
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

  // 4. Compute signature
  const signature = await signPayload(identityPrivateKey, payload);

  // 5. Add signature to payload before sending
  payload.signature = signature;

  // 6. Send to backend
  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload
  });

  return response.data;
}
