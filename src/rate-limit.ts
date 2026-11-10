export const DEFAULT_TOKEN_BUDGET = 25_000;

export interface RateLimitState {
  tokensRemaining: number;
  tokensUsed: number;
  tokenLimit: number;
  requestsUsed: number;
  rateLimited: boolean;
}
