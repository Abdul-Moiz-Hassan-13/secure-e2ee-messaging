import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import RegisterPage from "./pages/RegisterPage";
import FileTest from "./pages/FileTest";
import FileDownloadTest from "./pages/FileDownloadTest";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import ChatSelectPage from "./pages/SelectChatPage";

function App() {
  const [sessionKey, setSessionKey] = useState(null);

useEffect(() => {
  async function loadSharedKey() {
    const SHARED_KEY_B64 = "kfh1C+0qz0s6eQ+zG2d4wq3z+7pZp0w7u8ZbC2p0y4M=";

    // Decode base64 → Uint8Array
    const binary = atob(SHARED_KEY_B64);
    const keyBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      keyBytes[i] = binary.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );

    setSessionKey(key);
    }

    loadSharedKey();
  }, []);

  if (!sessionKey) {
    return <div style={{ padding: 20 }}>Generating test session key…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/file-test" element={<FileTest sessionKey={sessionKey} />} />
        <Route path="/file-download" element={<FileDownloadTest sessionKey={sessionKey} />} />
        <Route path="/chat-select" element={<ChatSelectPage />} />
        <Route
          path="/chat/:peerId"
          element={<ChatPage currentUserId={localStorage.getItem("userId")} />}
        />      
      </Routes>
    </BrowserRouter>
  );

}

export default App;
