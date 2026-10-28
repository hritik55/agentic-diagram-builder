import { Excalidraw } from "@excalidraw/excalidraw";
import {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import { useCallback, useRef } from "react";

interface CanvasProps {
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  onThemeChange?: (theme: "light" | "dark") => void;
}

export default function Canvas({ onApiReady, onThemeChange }: CanvasProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const lastTheme = useRef<string>("light");

  const handleMount = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      onApiReady?.(api);
    },
    [onApiReady],
  );

  const handleChange = useCallback(
    (_elements: readonly any[], appState: AppState) => {
      if (appState.theme !== lastTheme.current) {
        lastTheme.current = appState.theme;
        onThemeChange?.(appState.theme);
      }
    },
    [onThemeChange],
  );

  return (
    <div className="canvas-wrapper">
      <Excalidraw
        excalidrawAPI={handleMount}
        initialData={{ appState: { openSidebar: null } }}
        onChange={handleChange}
      />
    </div>
  );
}
