import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import RegisterPage from "./pages/RegisterPage";
import FileTest from "./pages/FileTest";
// import FileDownloadTest from "./pages/FileDownloadTest";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ChatSelectPage from "./pages/SelectChatPage";
import ChatWrapper from "./ChatWrapper";

function App() {
  const [sessionKey, setSessionKey] = useState(null);

useEffect(() => {

  const uid = localStorage.getItem("userId");
  if (uid === "null" || uid === "undefined") {
    localStorage.removeItem("userId");
  }

  async function loadSharedKey() {
    const SHARED_KEY_B64 = "kfh1C+0qz0s6eQ+zG2d4wq3z+7pZp0w7u8ZbC2p0y4M=";

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/file-test" element={<FileTest sessionKey={sessionKey} />} />
        {/* <Route path="/file-download" element={<FileDownloadTest sessionKey={sessionKey} />} /> */}
        <Route path="/chat-select" element={<ChatSelectPage />} />
        <Route 
        path="/chat/:peerId"
        element={<ChatWrapper />} 
        />
      </Routes>
    </BrowserRouter>
  );

}

export default App;
