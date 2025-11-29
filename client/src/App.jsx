import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import RegisterPage from "./pages/RegisterPage";
import FileTest from "./pages/FileTest";
import FileDownloadTest from "./pages/FileDownloadTest";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [sessionKey, setSessionKey] = useState(null);

  useEffect(() => {
    async function generateTestKey() {
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      setSessionKey(key);
    }

    generateTestKey();
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
        <Route
          path="/file-download"
          element={<FileDownloadTest sessionKey={sessionKey} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
