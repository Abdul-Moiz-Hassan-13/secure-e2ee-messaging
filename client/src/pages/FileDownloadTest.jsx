import { useState } from "react";
import { downloadAndDecryptFile } from "../api/files";

export default function FileDownloadTest({ sessionKey }) {
  const [fileId, setFileId] = useState("");

  async function handleDownload() {
    const { blob, filename } =
      await downloadAndDecryptFile(sessionKey, fileId);

    const url = URL.createObjectURL(blob);

    // Trigger browser download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log("File decrypted and downloaded:", filename);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Encrypted File Download Test</h2>

      <input
        style={{ width: 300, padding: 8 }}
        type="text"
        placeholder="Enter file ID"
        value={fileId}
        onChange={(e) => setFileId(e.target.value)}
      />

      <button
        onClick={handleDownload}
        style={{ marginLeft: 10, padding: "8px 16px" }}
      >
        Download & Decrypt
      </button>
    </div>
  );
}
