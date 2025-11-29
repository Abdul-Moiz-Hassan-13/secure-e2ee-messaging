import { useEffect, useState } from "react";
import { encryptFileBuffer, decryptFileBuffer } from "../crypto/fileEncryption";

export default function FileTest() {
  const [sessionKey, setSessionKey] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedBlob, setDecryptedBlob] = useState(null);

  useEffect(() => {
    (async () => {
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      setSessionKey(key);
    })();
  }, []);

  async function handleEncrypt() {
    if (!selectedFile || !sessionKey) return;

    const arrayBuffer = await selectedFile.arrayBuffer();

    const encrypted = await encryptFileBuffer(sessionKey, arrayBuffer);

    console.log("Encrypted File:", encrypted);

    setEncryptedData(encrypted);
  }

  async function handleDecrypt() {
    if (!encryptedData || !sessionKey) return;

    const decryptedBuffer = await decryptFileBuffer(
      sessionKey,
      encryptedData.ciphertext,
      encryptedData.iv
    );

    const blob = new Blob([decryptedBuffer], {
      type: selectedFile.type,
    });

    setDecryptedBlob(blob);

    console.log("File decrypted successfully!");
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Local File Encryption Test</h2>

      {!sessionKey && <p>Generating session key...</p>}

      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files[0])}
      />

      <button onClick={handleEncrypt}>Encrypt File</button>

      {encryptedData && (
        <>
          <p>Encrypted successfully!</p>
          <button onClick={handleDecrypt}>Decrypt File</button>
        </>
      )}

      {decryptedBlob && (
        <>
          <p>Decrypted successfully!</p>
          <a
            href={URL.createObjectURL(decryptedBlob)}
            download={`decrypted_${selectedFile.name}`}
          >
            Download Decrypted File
          </a>
        </>
      )}
    </div>
  );
}
