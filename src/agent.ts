import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamAgent } from "./agent-core";
interface Env {
  OPENAI_API_KEY: string;
}

export class DesignAgent extends AIChatAgent<Env> {
  async onChatMessage() {
    const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });

    const result = streamAgent({
      model: openai("gpt-5.4-mini"),
      messages: await convertToModelMessages(this.messages),
    });
    console.log(result);
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream, tools }),
    });
  }
}
