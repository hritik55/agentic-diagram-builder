import { AIChatAgent } from "@cloudflare/ai-chat";
import type { Connection } from "agents";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamAgent } from "./agent-core";
import { tools } from "./tools";
import { DEFAULT_TOKEN_BUDGET, type RateLimitState } from "./rate-limit";

interface Env extends Cloudflare.Env {
  OPENAI_API_KEY: string;
}

export class DesignAgent extends AIChatAgent<Env, RateLimitState> {
  initialState: RateLimitState = {
    tokensRemaining: DEFAULT_TOKEN_BUDGET,
    tokensUsed: 0,
    tokenLimit: DEFAULT_TOKEN_BUDGET,
    requestsUsed: 0,
    rateLimited: false,
  };

  // Prevent clients from modifying their own token budget over WebSocket
  validateStateChange(_nextState: RateLimitState, source: Connection | "server") {
    if (source !== "server") {
      throw new Error("Rate limit state can only be updated by the server.");
    }
  }

  async onChatMessage() {
    const current = this.state ?? this.initialState;

    if (current.tokensRemaining <= 0) {
      return new Response(
        "⚠️ Rate limit reached: You have used all of your allocated tokens for this session.",
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      );
    }

    const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });

    const result = streamAgent({
      model: openai("gpt-5.4-mini"),
      messages: await convertToModelMessages(this.messages),
      onFinish: ({ totalUsage }) => {
        const latest = this.state ?? this.initialState;
        const promptTokens = totalUsage?.inputTokens ?? 0;
        const completionTokens = totalUsage?.outputTokens ?? 0;
        const spent =
          totalUsage?.totalTokens ?? promptTokens + completionTokens;

        const nextUsed = latest.tokensUsed + spent;
        const nextRemaining = Math.max(0, latest.tokenLimit - nextUsed);

        this.setState({
          ...latest,
          tokensUsed: nextUsed,
          tokensRemaining: nextRemaining,
          requestsUsed: latest.requestsUsed + 1,
          rateLimited: nextRemaining <= 0,
        });
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream, tools }),
    });
  }
}
