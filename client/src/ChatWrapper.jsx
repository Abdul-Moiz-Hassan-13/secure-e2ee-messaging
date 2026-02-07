import { useEffect, useState } from "react";
import ChatPage from "./pages/ChatPage";

export default function ChatWrapper() {
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("userId");

    console.log("🔍 ChatWrapper: stored userId =", stored);

    if (!stored || stored === "null" || stored === "undefined") {
      console.error("Invalid userId in localStorage:", stored);
      return;
    }

    setUid(stored);
  }, []);

  if (!uid) {
    return <div>Loading user…</div>;
  }

  return <ChatPage currentUserId={uid} />;
}
