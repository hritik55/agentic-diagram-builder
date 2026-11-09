import {
  generateText,
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { tools } from "./tools";
import { SYSTEM_PROMPT } from "./system-prompt";

interface AgentArgs {
  model: LanguageModel;
  messages: ModelMessage[];
  system?: string;
  canvasState?: any[];
  maxSteps?: number;
}

export function streamAgent({
  model,
  messages,
  system = SYSTEM_PROMPT,
  maxSteps = 5,
}: AgentArgs) {
  return streamText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });
}

export async function runAgent({
  model,
  messages,
  canvasState,
  system = SYSTEM_PROMPT,
  maxSteps = 5,
}: AgentArgs) {
  const result = await generateText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });
  return {
    text: result.text,
    elements: extractElements(result.steps, canvasState ?? []),
    steps: result.steps,
  };
}

interface StepLike {
  toolResults?: { toolName: string; output: unknown }[];
}

export function extractElements(steps: StepLike[], initial: any[] = []): any[] {
  let canvas = [...initial];

  for (const step of steps) {
    for (const toolResult of step.toolResults ?? []) {
      if (toolResult.toolName === "generateDiagram") {
        const output = toolResult.output as any;
        if (Array.isArray(output)) {
          canvas = [...output];
        }
      } else if (toolResult.toolName === "modifyDiagram") {
        const output = toolResult.output as any;
        if (typeof output?.elementId === "string" && output.updates) {
          const target = canvas.find((el) => el.id === output.elementId);
          if (target) Object.assign(target, output.updates);
        }
      }
    }
  }

  return canvas;
}
