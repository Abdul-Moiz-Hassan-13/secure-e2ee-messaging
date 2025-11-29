import { useEffect, useRef, useState } from "react";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";

export default function ChatPage({ sessionKey, userId, peerId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversation() {
    const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
    setMessages(msgs);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSend() {
    if (!input.trim()) return;

    await sendEncryptedMessage(sessionKey, userId, peerId, input);

    setInput("");

    loadConversation();
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl border border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Encrypted Chat
          </h2>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === userId;

            return (
              <div
                key={idx}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-xs px-4 py-2 rounded-xl shadow-sm text-sm
                    ${isMine
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"}
                  `}
                >
                  {msg.plaintext}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input Area */}
        <div className="border-t px-4 py-3 bg-white">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="
                flex-1 px-4 py-2 border rounded-lg shadow-sm
                focus:ring-2 focus:ring-blue-500 focus:outline-none
              "
            />

            <button
              onClick={handleSend}
              className="
                px-5 py-2 bg-blue-600 hover:bg-blue-700 
                text-white font-medium rounded-lg shadow-md transition
              "
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
