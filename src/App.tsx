import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useCallback, useState, useRef, useEffect } from "react";
import Canvas from "./components/Canvas";
import ChatPanel from "./components/chat/ChatPanel";
import AuthScreen from "./auth/AuthScreen";
import { useAuth } from "./auth/useAuth";
import type { RateLimitState } from "./rate-limit";
import "./App.css";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";

function Workspace({
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string;
}) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [rateLimit, setRateLimit] = useState<RateLimitState | undefined>(
    undefined,
  );

  const appliedToolCalls = useRef(new Set());

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  // The worker verifies this Supabase JWT before routing to the agent.
  // Keying the Durable Object instance by `userId` ensures the user's token
  // budget and rate limit persist across page reloads.
  const agent = useAgent<RateLimitState>({
    agent: "design-agent",
    name: userId,
    query: { token: accessToken },
    onStateUpdate: (nextState) => {
      setRateLimit(nextState);
    },
  });
  const { messages, sendMessage, status } = useAgentChat({
    agent,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  useEffect(() => {
    if (!excalidrawAPI) return;
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts ?? []) {
        if (
          part.type !== "tool-generateDiagram" &&
          part.type !== "tool-modifyDiagram"
        ) {
          continue;
        }
        if (part.state !== "output-available") continue;

        if (appliedToolCalls.current.has(part.toolCallId)) continue;

        if (part.type === "tool-generateDiagram") {
          appliedToolCalls.current.add(part.toolCallId);
          const output = part.output;
          const skeletonElements = output;

          if (Array.isArray(skeletonElements) && skeletonElements.length > 0) {
            const elements = convertToExcalidrawElements(skeletonElements, {
              regenerateIds: false,
            });
            excalidrawAPI.updateScene({ elements });
            excalidrawAPI.scrollToContent(elements, { fitToContent: true });
          }
        } else if (part.type === "tool-modifyDiagram") {
          appliedToolCalls.current.add(part.toolCallId);
          const output = part.output as {
            elementId: string;
            updates?: Record<string, any>;
          };

          if (output?.elementId && output.updates) {
            const current = excalidrawAPI.getSceneElements();
            const next = current.map((el) =>
              el.id === output.elementId
                ? newElementWith(el, output.updates as any)
                : el,
            ) as any;

            excalidrawAPI.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        }
      }
    }
  }, [messages, excalidrawAPI]);

  return (
    <div className={`app ${theme}`}>
      <div className="canvas-container">
        <Canvas onApiReady={handleApiReady} onThemeChange={setTheme} />
      </div>
      <ChatPanel
        messages={messages}
        sendMessage={sendMessage}
        status={status}
        rateLimit={rateLimit ?? agent.state}
      />
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-loading">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <Workspace
      userId={session.user.id}
      accessToken={session.access_token}
    />
  );
}
