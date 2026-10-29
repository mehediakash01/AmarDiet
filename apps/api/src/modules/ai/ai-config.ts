/**
 * Reads an env var, trimming whitespace and stray surrounding quotes.
 * Returns undefined for unset / blank values.
 *
 * `GEMINI_API_KEY="abc"` or a trailing space/CRLF from a Windows editor
 * is enough to make a perfectly good key fail with a 400/401, and the
 * resulting error looks like "bad key" rather than "bad .env formatting".
 */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const cleaned = raw
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Accepts "models/gemini-x" (as the Gemini list API returns it) or "gemini-x". */
export function normalizeGeminiModel(model: string): string {
  return model.trim().replace(/^models\//, '');
}

interface ProviderEnvSpec {
  provider: string;
  keyVar: string;
  visionModelVar?: string;
  chatModelVar: string;
}

export const PROVIDER_ENV_SPECS: ProviderEnvSpec[] = [
  {
    provider: 'gemini',
    keyVar: 'GEMINI_API_KEY',
    visionModelVar: 'GEMINI_VISION_MODEL',
    chatModelVar: 'GEMINI_CHAT_MODEL',
  },
  {
    provider: 'groq',
    keyVar: 'GROQ_API_KEY',
    visionModelVar: 'GROQ_VISION_MODEL',
    chatModelVar: 'GROQ_CHAT_MODEL',
  },
  {
    provider: 'openrouter',
    keyVar: 'OPENROUTER_API_KEY',
    visionModelVar: 'OPENROUTER_VISION_MODEL',
    chatModelVar: 'OPENROUTER_CHAT_MODEL',
  },
  {
    provider: 'mistral',
    keyVar: 'MISTRAL_API_KEY',
    chatModelVar: 'MISTRAL_CHAT_MODEL',
  },
];

/**
 * A provider is only registered when BOTH its key and its model name are set.
 * The most common way to end up with "AI doesn't work" is setting the key and
 * forgetting the model (the .env.example ships with every model blank), which
 * previously skipped the provider with no hint at all. This reports it.
 */
export function collectAiConfigWarnings(): string[] {
  const warnings: string[] = [];
  for (const spec of PROVIDER_ENV_SPECS) {
    const hasKey = !!readEnv(spec.keyVar);
    const features: Array<[string, string | undefined]> = [
      ['chat', spec.chatModelVar],
      ['meal scan', spec.visionModelVar],
    ];
    for (const [feature, modelVar] of features) {
      if (!modelVar) continue;
      const hasModel = !!readEnv(modelVar);
      // Only the key-without-model direction is reported. A model with no key
      // is the normal state for a provider you simply aren't using (the
      // .env.example ships pre-filled model names).
      if (hasKey && !hasModel) {
        warnings.push(
          `${spec.keyVar} is set but ${modelVar} is empty -> ${spec.provider} is SKIPPED for ${feature}.`,
        );
      }
    }
  }
  return warnings;
}
