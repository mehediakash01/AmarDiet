/**
 * Extracts a JSON object from a model's raw text response. Even when a
 * provider is explicitly asked for JSON-only output, some models (especially
 * free/community ones on OpenRouter) still wrap it in a markdown code fence
 * or add a stray sentence before/after. This strips that defensively.
 *
 * This does NOT validate the shape of the JSON — that's Zod's job, always
 * applied by the caller right after this. This function only gets raw text
 * into a parseable object or throws.
 */
export function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim();

  // Try straight parse first — the common case when a provider actually
  // honors JSON-only output.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to fence-stripping
  }

  // Strip a ```json ... ``` or ``` ... ``` fence if present.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // Last resort: grab the first {...} block in the text.
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return JSON.parse(braceMatch[0]);
  }

  throw new Error('No JSON object found in model response');
}
