import { useState } from "react";
import "./chat.css";
import MessageList from "./MessageList";
import { UIMessage } from "ai";
import { useAuth } from "../../auth/useAuth";
import { DEFAULT_TOKEN_BUDGET, type RateLimitState } from "../../rate-limit";

interface ChatPanelProps {
  messages: UIMessage[];
  sendMessage: (message: {
    role: "user";
    parts: { type: "text"; text: string }[];
  }) => void;
  status: string;
  rateLimit?: RateLimitState;
}

export default function ChatPanel({
  messages,
  sendMessage,
  status,
  rateLimit,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const { signOut } = useAuth();

  const tokensRemaining = rateLimit?.tokensRemaining ?? DEFAULT_TOKEN_BUDGET;
  const tokenLimit = rateLimit?.tokenLimit ?? DEFAULT_TOKEN_BUDGET;
  const isRateLimited = rateLimit?.rateLimited ?? tokensRemaining <= 0;
  const ratioLeft = tokenLimit > 0 ? tokensRemaining / tokenLimit : 0;

  const badgeStatus = isRateLimited
    ? "exhausted"
    : ratioLeft <= 0.2
      ? "warning"
      : "normal";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRateLimited) return;
    // image input - future scope
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  const isStreaming = status == "submitted" || status === "streaming";

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>Chat</h2>
        <div className="chat-header-controls">
          <div
            className={`token-badge ${badgeStatus}`}
            title={`${tokensRemaining.toLocaleString()} / ${tokenLimit.toLocaleString()} tokens remaining`}
          >
            <span className="token-dot" />
            <span>{tokensRemaining.toLocaleString()} tokens left</span>
          </div>
          <button
            type="button"
            className="chat-signout-btn"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      </div>
      <MessageList messages={messages} />
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder={
            isRateLimited
              ? "Token limit reached for this session"
              : "Describe a diagram..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming || isRateLimited}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isStreaming || isRateLimited || !input.trim()}
        >
          {isStreaming ? "...." : "Send"}
        </button>
      </form>
    </div>
  );
}
