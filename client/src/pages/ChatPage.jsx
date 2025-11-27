import { useEffect, useState } from "react";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";

export default function ChatPage({ sessionKey, userId, peerId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Load conversation on mount
  useEffect(() => {
    loadConversation();
  }, []);

  async function loadConversation() {
    const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
    setMessages(msgs);
  }

  async function handleSend() {
    if (!input.trim()) return;

    await sendEncryptedMessage(
      sessionKey,
      userId,
      peerId,
      input
    );

    setInput("");

    // reload decrypted conversation
    loadConversation();
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h2>Encrypted Chat</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          height: 300,
          overflowY: "scroll",
          marginBottom: 10
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.senderId === userId ? "right" : "left",
              margin: "10px 0"
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 10,
                background: msg.senderId === userId ? "#d1ffd6" : "#e6e6e6"
              }}
            >
              {msg.plaintext}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 5
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />

        <button
          onClick={handleSend}
          style={{
            padding: "10px 15px",
            borderRadius: 5,
            background: "#333",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
