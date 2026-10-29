/**
 * Shared parsing for Gemini generateContent responses (chat + vision).
 *
 * Why this exists: both Gemini providers used to read
 * `candidates[0].content.parts[0].text`. Current Gemini models "think"
 * before answering, and those thinking tokens count against
 * maxOutputTokens. With a small cap the model can burn the whole budget
 * thinking and return no text at all (finishReason MAX_TOKENS) — which
 * surfaced only as a vague "response contained no text". Thought parts can
 * also precede the real answer, so we join every non-thought text part
 * instead of trusting index 0, and we explain *why* a response was empty.
 */
export interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export function extractGeminiText(data: GeminiGenerateContentResponse): string | null {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();
  return text.length > 0 ? text : null;
}

/** Human-readable reason for an empty Gemini response, for logs / status. */
export function explainEmptyGeminiResponse(data: GeminiGenerateContentResponse): string {
  const block = data.promptFeedback?.blockReason;
  if (block) return `request was blocked by Gemini (${block})`;

  const finish = data.candidates?.[0]?.finishReason;
  if (finish === 'MAX_TOKENS') {
    return 'model hit the output token limit before producing any text (raise maxOutputTokens)';
  }
  if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST') {
    return `response was blocked (${finish})`;
  }
  if (!data.candidates || data.candidates.length === 0) {
    return 'response had no candidates (model may not support this input)';
  }
  return `response contained no text${finish ? ` (finishReason ${finish})` : ''}`;
}
