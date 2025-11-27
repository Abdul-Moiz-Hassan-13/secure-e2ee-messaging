import axiosClient from "./axiosClient";
import { decryptFileBuffer } from "../crypto/fileEncryption";

// Download encrypted file + decrypt using sessionKey
export async function downloadAndDecryptFile(sessionKey, fileId) {
  // 1. GET encrypted file metadata + ciphertext
  const { data } = await axiosClient.get(`/files/download/${fileId}`);

  const {
    filename,
    ciphertext,
    iv,
    mimeType
  } = data;

  // 2. Decrypt binary buffer
  const decryptedBuffer = await decryptFileBuffer(
    sessionKey,
    ciphertext,
    iv
  );

  // 3. Convert to Blob so user can download it
  const blob = new Blob([decryptedBuffer], { type: mimeType });

  return { blob, filename };
}
