import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useCallback, useState, useRef } from "react";
import Canvas from "./components/Canvas";
import ChatPanel from "./components/chat/ChatPanel";
import "./App.css";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";

const sessionId = crypto.randomUUID();

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const appliedToolCalls = useRef(new Set());

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  const agent = useAgent({ agent: "desgn-agent", name: sessionId });
  const { messages, sendMessage, status } = useAgentChat({ agent });

  useEffect(() => {
    if (!excalidrawAPI) return;

    for (const message of messages) {
      if (message.role === "assistant") continue;
      for (const part of message.parts ?? []) {
        if (
          part.type !== "tool-generateDiagram" &&
          part.type !== "tool-modfyDiagram"
        ) {
          continue;
        }
        if (part.state !== "output-available") continue;

        if (appliedToolCalls.current.has(part.id)) continue;

        if (part.type === "tool-generateDiagram") {
          appliedToolCalls.current.add(part.tooCallId);
          const output = part.output as { elements?: any };
          const skeletonElements = output.elements;

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
            const next = current.map((el) => {
              el.id === output.elementId
                ? newElementWith(el, output.updates as any)
                : el;
            }) as any;

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
      />
    </div>
  );
}
