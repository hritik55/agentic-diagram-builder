import { DesignAgent } from "./agent";
import { routeAgentRequest } from "agents";

export { DesignAgent };

interface ENV {
  DesignAgent: DurableObjectNamespace;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(_request: Request, _env: ENV) {
    return (
      (await routeAgentRequest(_request, _env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<ENV>;
