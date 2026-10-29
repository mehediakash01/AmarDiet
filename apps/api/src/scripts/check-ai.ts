/**
 * `pnpm ai:check` — verifies the AI setup end to end, using the SAME provider
 * classes the server uses, so a pass here means chat / meal scan will work.
 *
 * For every provider that has an API key set it:
 *   1. checks the key + model env vars are both present,
 *   2. sends one tiny real chat request,
 *   3. sends one tiny real image request (meal scan),
 *   4. on any failure, lists the models your key can actually use, because
 *      "model not found" (retired / mistyped model name) is the #1 cause.
 *
 * It never prints API keys.
 */
import '../load-env.js';
import zlib from 'node:zlib';
import { PROVIDER_ENV_SPECS, readEnv } from '../modules/ai/ai-config.js';
import { GeminiChatProvider } from '../modules/ai/providers/gemini-chat.provider.js';
import { GroqChatProvider } from '../modules/ai/providers/groq-chat.provider.js';
import { OpenRouterChatProvider } from '../modules/ai/providers/openrouter-chat.provider.js';
import { MistralChatProvider } from '../modules/ai/providers/mistral-chat.provider.js';
import type { ChatProvider } from '../modules/ai/providers/chat-types.js';
import { GeminiVisionProvider } from '../modules/ai/providers/gemini.provider.js';
import { GroqVisionProvider } from '../modules/ai/providers/groq.provider.js';
import { OpenRouterVisionProvider } from '../modules/ai/providers/openrouter.provider.js';
import type { VisionProvider } from '../modules/ai/providers/types.js';

const TEST_TIMEOUT_MS = 45_000;

type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'mistral';

interface ModelInfo {
  id: string;
  vision?: boolean;
  free?: boolean;
}

// ---------------------------------------------------------------- PNG test image

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** A small valid RGB PNG (a colour gradient — not food, which is the point). */
function makeTestPng(size = 96): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const rowLength = 1 + size * 3;
  const raw = Buffer.alloc(rowLength * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLength; // filter byte stays 0
    for (let x = 0; x < size; x++) {
      const i = rowStart + 1 + x * 3;
      raw[i] = (x * 4) % 256;
      raw[i + 1] = (y * 4) % 256;
      raw[i + 2] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- helpers

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function hintFor(message: string): string {
  const status = message.match(/HTTP (\d{3})/)?.[1];
  if (status === '401' || status === '403' || /api key|unauthori[sz]ed|permission/i.test(message)) {
    return 'The API key looks invalid, expired, or not allowed to use this model. Create a fresh key and update .env.';
  }
  if (status === '404' || /not found|no longer available|decommission|deprecat|retired/i.test(message)) {
    return 'This model name does not exist (anymore). Pick one from the list below and update the *_MODEL variable.';
  }
  if (status === '429' || /quota|rate limit|resource.?exhausted/i.test(message)) {
    return 'Rate limit / free-tier quota hit. Wait a minute and retry, or add another provider as a fallback.';
  }
  if (status === '400' && /image|vision|multimodal|modalit/i.test(message)) {
    return 'This model probably does not accept images. Use a vision-capable model for the *_VISION_MODEL variable.';
  }
  if (/network request failed|fetch failed|ENOTFOUND|ECONN|timed out/i.test(message)) {
    return 'Could not reach the provider. Check your internet connection / firewall / VPN.';
  }
  if (/schema validation|could not extract JSON/i.test(message)) {
    return 'The model answered, but not in the required JSON shape. Try a stronger vision model.';
  }
  return '';
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await withTimeout(fetch(url, { headers }), 20_000);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function listModels(provider: ProviderId, key: string): Promise<ModelInfo[]> {
  switch (provider) {
    case 'gemini': {
      const data = (await getJson(
        'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
        { 'x-goog-api-key': key },
      )) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
      return (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .filter((id) => /^gemini/.test(id) && !/tts|image|live|audio|embedding|robotics|veo/i.test(id))
        .map((id) => ({ id, vision: true }));
    }
    case 'groq': {
      const data = (await getJson('https://api.groq.com/openai/v1/models', {
        Authorization: `Bearer ${key}`,
      })) as { data?: Array<{ id: string }> };
      return (data.data ?? [])
        .map((m) => m.id)
        .filter((id) => !/whisper|tts|guard|orpheus|playai|embed/i.test(id))
        .map((id) => ({ id }));
    }
    case 'openrouter': {
      const data = (await getJson('https://openrouter.ai/api/v1/models', {
        Authorization: `Bearer ${key}`,
      })) as {
        data?: Array<{
          id: string;
          pricing?: { prompt?: string; completion?: string };
          architecture?: { input_modalities?: string[] };
        }>;
      };
      return (data.data ?? []).map((m) => ({
        id: m.id,
        free: Number(m.pricing?.prompt ?? 1) === 0 && Number(m.pricing?.completion ?? 1) === 0,
        vision: m.architecture?.input_modalities?.includes('image') ?? false,
      }));
    }
    case 'mistral': {
      const data = (await getJson('https://api.mistral.ai/v1/models', {
        Authorization: `Bearer ${key}`,
      })) as { data?: Array<{ id: string }> };
      return (data.data ?? [])
        .map((m) => m.id)
        .filter((id) => !/embed|moderation|ocr/i.test(id))
        .map((id) => ({ id }));
    }
  }
}

function printModelHints(provider: ProviderId, models: ModelInfo[], wantVision: boolean): void {
  let shown = models;
  let label = 'models your key can use';
  if (provider === 'openrouter') {
    shown = models.filter((m) => m.free && (!wantVision || m.vision));
    label = wantVision ? 'FREE vision-capable models' : 'FREE models';
  }
  const ids = shown.map((m) => m.id).sort();
  if (ids.length === 0) {
    console.log(`      (no ${label} found)`);
    return;
  }
  console.log(`      ${label}${ids.length > 25 ? ` (first 25 of ${ids.length})` : ''}:`);
  for (const id of ids.slice(0, 25)) console.log(`        - ${id}`);
}

function buildChatProvider(id: ProviderId, key: string, model: string): ChatProvider {
  switch (id) {
    case 'gemini':
      return new GeminiChatProvider(key, model);
    case 'groq':
      return new GroqChatProvider(key, model);
    case 'openrouter':
      return new OpenRouterChatProvider(key, model);
    case 'mistral':
      return new MistralChatProvider(key, model);
  }
}

function buildVisionProvider(id: ProviderId, key: string, model: string): VisionProvider | null {
  switch (id) {
    case 'gemini':
      return new GeminiVisionProvider(key, model);
    case 'groq':
      return new GroqVisionProvider(key, model);
    case 'openrouter':
      return new OpenRouterVisionProvider(key, model);
    case 'mistral':
      return null; // no vision support in this app
  }
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  console.log('\nAmarDiet AI check\n=================\n');

  let configuredFeatures = 0;
  let passed = 0;
  let failed = 0;
  let cachedPng: Buffer | null = null;

  for (const spec of PROVIDER_ENV_SPECS) {
    const id = spec.provider as ProviderId;
    const key = readEnv(spec.keyVar);
    const chatModel = readEnv(spec.chatModelVar);
    const visionModel = spec.visionModelVar ? readEnv(spec.visionModelVar) : undefined;

    console.log(`[${id}]`);
    if (!key) {
      console.log(`  - skipped: ${spec.keyVar} is not set\n`);
      continue;
    }

    let modelsPromise: Promise<ModelInfo[]> | null = null;
    const modelsOnce = (): Promise<ModelInfo[]> => (modelsPromise ??= listModels(id, key));

    const features: Array<{ feature: 'chat' | 'meal scan'; modelVar?: string; model?: string }> = [
      { feature: 'chat', modelVar: spec.chatModelVar, model: chatModel },
      ...(spec.visionModelVar
        ? [{ feature: 'meal scan' as const, modelVar: spec.visionModelVar, model: visionModel }]
        : []),
    ];

    for (const { feature, modelVar, model } of features) {
      const wantVision = feature === 'meal scan';
      if (!model) {
        failed++;
        configuredFeatures++;
        console.log(`  ✖ ${feature}: ${modelVar} is empty — this provider is skipped for ${feature}.`);
        try {
          printModelHints(id, await modelsOnce(), wantVision);
        } catch (e) {
          console.log(`      (could not list models: ${errorMessage(e)})`);
        }
        continue;
      }

      configuredFeatures++;
      const started = Date.now();
      try {
        if (feature === 'chat') {
          const reply = await withTimeout(
            // A realistic, multi-sentence request. A one-word "pong" test
            // passes even when reasoning models burn their whole token budget
            // on thinking and return nothing for real questions.
            buildChatProvider(id, key, model).chat('You are a helpful nutrition assistant.', [
              {
                role: 'user',
                content:
                  'Give me a 3-day Bengali diet plan for weight loss: breakfast, lunch, dinner and a snack for each day.',
              },
            ]),
            TEST_TIMEOUT_MS,
          );
          console.log(
            `  ✔ chat via ${model} (${Date.now() - started}ms, ${reply.length} chars): ` +
              `"${reply.replace(/\s+/g, ' ').slice(0, 60)}..."`,
          );
        } else {
          const provider = buildVisionProvider(id, key, model);
          if (!provider) continue;
          cachedPng ??= makeTestPng();
          const result = await withTimeout(
            provider.analyzeMealPhoto(cachedPng.toString('base64'), 'image/png'),
            TEST_TIMEOUT_MS,
          );
          console.log(
            `  ✔ meal scan via ${model} (${Date.now() - started}ms): ` +
              `isFood=${result.isFood}, items=${result.items.length} (a gradient is correctly "not food")`,
          );
        }
        passed++;
      } catch (e) {
        failed++;
        const message = errorMessage(e);
        console.log(`  ✖ ${feature} via ${model} (${modelVar}): ${message}`);
        const hint = hintFor(message);
        if (hint) console.log(`      → ${hint}`);
        if (/HTTP 404|not found|HTTP 400/i.test(message) || !hint) {
          try {
            printModelHints(id, await modelsOnce(), wantVision);
          } catch (listError) {
            console.log(`      (could not list models: ${errorMessage(listError)})`);
          }
        }
      }
    }
    console.log('');
  }

  if (configuredFeatures === 0) {
    console.log('No provider has an API key set. Add at least one in apps/api/.env:');
    console.log('  GEMINI_API_KEY=...   (free key: https://aistudio.google.com/apikey)\n');
    process.exitCode = 1;
    return;
  }

  console.log(`Result: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('AI features are ready. Restart the API (pnpm dev:api) if it is already running.\n');
  } else {
    console.log('Fix the ✖ items above, save apps/api/.env, and run `pnpm ai:check` again.');
    console.log('Note: you only need ONE provider to pass for chat, and one for meal scan.\n');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('check-ai crashed:', e);
  process.exitCode = 1;
});
