/**
 * Shared helpers for the OpenAI-compatible chat providers (Groq, OpenRouter,
 * Mistral).
 *
 * Why this exists: current Groq/OpenRouter models (gpt-oss, Qwen 3.x, Gemma
 * thinking variants, ...) "think" before answering, and those reasoning
 * tokens count against max_tokens. With the old cap of 800, a long answer
 * (e.g. "3-day diet plan") could spend the whole budget thinking and return
 * an EMPTY message, which the gateway then treated as a provider failure —
 * so a one-word test passed while real questions failed.
 */

/** Output cap for chat replies. Includes any hidden reasoning tokens. */
export const CHAT_MAX_TOKENS = 4096;

export interface OpenAiChatResponse {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null };
  }>;
}

export function extractOpenAiText(data: OpenAiChatResponse): string | null {
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? text : null;
}

/** Human-readable reason for an empty reply, for logs / /api/ai/status. */
export function explainEmptyOpenAiResponse(data: OpenAiChatResponse): string {
  const finish = data.choices?.[0]?.finish_reason;
  if (finish === 'length') {
    return 'model used its whole output budget (likely on hidden reasoning) before writing an answer';
  }
  if (finish === 'content_filter') return 'response was blocked by a content filter';
  if (!data.choices || data.choices.length === 0) return 'response had no choices';
  return `response contained no message content${finish ? ` (finish_reason ${finish})` : ''}`;
}
