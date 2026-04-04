// Centralized model ID constants — update versions here only (AI-06: no hardcoded IDs)
export const CLAUDE_HAIKU_MODEL = "anthropic/claude-3.5-haiku";
export const GPT_MINI_MODEL = "openai/gpt-4o-mini";
export const GEMINI_FLASH_MODEL = "google/gemini-2.0-flash-001";
export const CLAUDE_SYNTHESIS_MODEL = "anthropic/claude-sonnet-4";

// Token caps (AI-06 cost control)
export const WORKER_MAX_TOKENS = 6144;
export const SYNTHESIS_MAX_TOKENS = 4096;
