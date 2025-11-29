import { useEffect, useState } from "react";
import { encryptFileBuffer, decryptFileBuffer } from "../crypto/fileEncryption";

export default function FileTest() {
  const [sessionKey, setSessionKey] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedBlob, setDecryptedBlob] = useState(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    
    const arrayBuffer = await selectedFile.arrayBuffer();
    const encrypted = await encryptFileBuffer(sessionKey, arrayBuffer);

    setEncryptedData(encrypted);
    setLoading(false);
  }

  async function handleDecrypt() {
    if (!encryptedData || !sessionKey) return;

    setLoading(true);

    const decryptedBuffer = await decryptFileBuffer(
      sessionKey,
      encryptedData.ciphertext,
      encryptedData.iv
    );

    const blob = new Blob([decryptedBuffer], {
      type: selectedFile.type,
    });

    setDecryptedBlob(blob);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Local File Encryption Test
        </h2>

        {!sessionKey ? (
          <p className="text-center text-gray-600 mb-6">Generating session key...</p>
        ) : (
          <>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full border p-3 rounded-lg shadow-sm mb-6"
            />

            <button
              onClick={handleEncrypt}
              disabled={!selectedFile || loading}
              className={`w-full py-3 rounded-xl font-semibold text-white 
                ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"} 
                transition-all shadow-md`}
            >
              {loading ? "Processing..." : "Encrypt File"}
            </button>

            {encryptedData && (
              <div className="mt-6 space-y-4">
                <p className="text-green-700 font-medium">File encrypted successfully.</p>

                <button
                  onClick={handleDecrypt}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold text-white 
                    ${loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"} 
                    transition-all shadow-md`}
                >
                  {loading ? "Processing..." : "Decrypt File"}
                </button>
              </div>
            )}

            {decryptedBlob && (
              <div className="mt-6">
                <p className="text-green-700 font-medium mb-2">File decrypted successfully.</p>
                <a
                  href={URL.createObjectURL(decryptedBlob)}
                  download={`decrypted_${selectedFile.name}`}
                  className="text-blue-600 underline"
                >
                  Download Decrypted File
                </a>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
