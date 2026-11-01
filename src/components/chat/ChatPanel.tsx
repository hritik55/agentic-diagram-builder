import { useState } from "react";
import type { Message } from "./types";
import "./chat.css";
import MessageList from "./MessageList";
import { UIMessage } from "ai";
import { useAuth } from "../../auth/useAuth";

interface ChatPanelProps {
  messages: UIMessage[];
  sendMessage: (message: {
    role: "user";
    parts: { type: "text"; text: string }[];
  }) => void;
  status: string;
}
export default function ChatPanel({
  messages,
  sendMessage,
  status,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const { signOut } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // image input - future scope
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  const isStreaming = status == "submitted" || status === "streaming";

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>Chat</h2>
        <button
          type="button"
          className="chat-signout-btn"
          onClick={signOut}
        >
          Sign Out
        </button>
      </div>
      <MessageList messages={messages} />
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Describe a diagram..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? "...." : "Send"}
        </button>
      </form>
    </div>
  );
}
