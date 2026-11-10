import { DesignAgent } from "./agent";
import { routeAgentRequest } from "agents";
import { authorizeAgentRequest, type AuthEnv } from "./server-auth";

export { DesignAgent };

interface ENV extends AuthEnv {
  DesignAgent: DurableObjectNamespace;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(_request: Request, _env: ENV) {
    return (
      (await routeAgentRequest(_request, _env, {
        // Verify the Supabase JWT and per-user room ownership before any
        // request reaches the Durable Object.
        onBeforeConnect: (req, route) => authorizeAgentRequest(req, _env, route),
        onBeforeRequest: (req, route) => authorizeAgentRequest(req, _env, route),
      })) || new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<ENV>;
