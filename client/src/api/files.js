import axiosClient from "./axiosClient";
import { decryptFileBuffer } from "../crypto/fileEncryption";

export async function downloadAndDecryptFile(sessionKey, fileId) {
  const { data } = await axiosClient.get(`/files/download/${fileId}`);

  const {
    filename,
    ciphertext,
    iv,
    mimeType
  } = data;

  const decryptedBuffer = await decryptFileBuffer(
    sessionKey,
    ciphertext,
    iv
  );

  const blob = new Blob([decryptedBuffer], { type: mimeType });

  return { blob, filename };
}
