import type { ProfileService } from '../profile/profile.service.js';
import type { FoodLogService } from '../food-log/food-log.service.js';
import type { DietPlanService } from '../diet-plan/diet-plan.service.js';
import type { ChatGateway } from './chat-gateway.js';
import type { ChatProviderMessage } from './providers/chat-types.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  subscriberId: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  providerUsed: string;
}

/**
 * Builds a system prompt grounded in the user's real data so answers
 * are about THEIR plan, not generic nutrition theory. Every number here
 * comes from the same deterministic engine as the rest of the app.
 */
async function buildSystemPrompt(
  subscriberId: string,
  profileService: ProfileService,
  foodLogService: FoodLogService,
  dietPlanService: DietPlanService,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const [profileResult, diaryResult, planResult] = await Promise.allSettled([
    profileService.getProfile(subscriberId),
    foodLogService.getDailyDiary(subscriberId, today),
    dietPlanService.getPlanBySubscriberId(subscriberId),
  ]);

  const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const diary = diaryResult.status === 'fulfilled' ? diaryResult.value : null;
  const plan = planResult.status === 'fulfilled' ? planResult.value : null;

  let profileSection = 'User profile: not available.';
  if (profileData) {
    const { profile, nutrition } = profileData;
    const prefStr = Array.isArray(profile.dietary_preferences)
      ? profile.dietary_preferences.join(', ')
      : profile.dietary_preferences && typeof profile.dietary_preferences === 'object'
        ? JSON.stringify(profile.dietary_preferences)
        : 'none';
    profileSection = `User profile:
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.height_cm} cm, Weight: ${profile.weight_kg} kg
- Activity level: ${profile.activity_level}
- Goal: ${profile.goal}${profile.target_weight_kg ? `, target weight: ${profile.target_weight_kg} kg` : ''}
- Dietary preferences: ${prefStr}
- Cuisine preference: ${profile.cuisine_preference || 'mixed'}
Daily nutrition targets:
- Calories: ${nutrition.calorieTarget} kcal
- Protein: ${nutrition.macros.protein_g} g, Carbs: ${nutrition.macros.carbs_g} g, Fat: ${nutrition.macros.fat_g} g`;
  }

  let logSection = `Today's food log (${today}): nothing logged yet.`;
  if (diary && diary.totals.calories > 0) {
    const t = diary.totals;
    const slotSummaries = Object.values(diary.meals)
      .filter((m) => m.items.length > 0)
      .map((m) => {
        const items = m.items.map((i) => `${i.foodName} (${i.quantity}${i.unit})`).join(', ');
        return `  ${m.mealSlot}: ${items} - ${m.subtotal.calories} kcal, ${m.subtotal.protein}g protein`;
      })
      .join('\n');
    logSection = `Today's food log (${today}):
${slotSummaries}
Total so far: ${t.calories} kcal, protein ${t.protein}g, carbs ${t.carbs}g, fat ${t.fat}g`;
  }

  let planSection = 'Diet plan: not generated yet.';
  if (plan) {
    planSection = `Diet plan summary:
- Calorie target: ${plan.calorieTarget} kcal/day
- Protein target: ${plan.proteinTarget_g} g, Carbs: ${plan.carbsTarget_g} g, Fat: ${plan.fatTarget_g} g
- 7-day plan is active (generated ${plan.createdAt.slice(0, 10)})`;
  }

  return `You are a friendly, knowledgeable nutrition assistant built into AmarDiet, a personalized diet tracking app.

You answer questions about the user's diet, nutrition, food choices, and health goals. You are grounded in their REAL data shown below - never invent numbers that are not there.

Rules:
- Be concise and practical, not lecture-y.
- When the user asks about their progress, calories, or macros, refer to the actual numbers from their profile and today's log.
- You may suggest foods, meal ideas, and swaps - always note that nutrition numbers come from the app's verified database, not estimates.
- If asked about medical conditions or medication, say you are a diet assistant and recommend consulting a doctor.
- Always respond in the same language the user writes in.
- Never make up calorie counts or macro numbers that are not in the user's data.

--- USER DATA ---
${profileSection}

${logSection}

${planSection}
--- END USER DATA ---`;
}

export class ChatService {
  constructor(
    private gateway: ChatGateway,
    private profileService: ProfileService,
    private foodLogService: FoodLogService,
    private dietPlanService: DietPlanService,
  ) {}

  async chat(
    request: ChatRequest,
  ): Promise<{ ok: true; data: ChatResponse } | { ok: false; status: number; error: string }> {
    if (!request.messages || request.messages.length === 0) {
      return { ok: false, status: 400, error: 'messages array must not be empty' };
    }

    const lastMsg = request.messages[request.messages.length - 1];
    if (lastMsg.role !== 'user') {
      return { ok: false, status: 400, error: 'last message must be from user' };
    }

    let systemPrompt: string;
    try {
      systemPrompt = await buildSystemPrompt(
        request.subscriberId,
        this.profileService,
        this.foodLogService,
        this.dietPlanService,
      );
    } catch {
      systemPrompt =
        "You are a friendly nutrition assistant. Answer the user's nutrition and diet questions helpfully.";
    }

    const messages: ChatProviderMessage[] = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const outcome = await this.gateway.chat(systemPrompt, messages);

    if (outcome.outcome === 'all_providers_failed') {
      // attemptedProviders is empty when every provider's circuit is open
      // (each failed 3x in a row and is cooling down for ~2 minutes).
      const detail =
        outcome.attemptedProviders.length > 0
          ? `Attempted: ${outcome.attemptedProviders.join(', ')}`
          : 'All providers are paused after repeated failures; retry in about 2 minutes';
      return {
        ok: false,
        status: 503,
        error: `All AI providers are currently unavailable. Please try again in a few minutes. ${detail}`,
      };
    }

    return {
      ok: true,
      data: { reply: outcome.reply, providerUsed: outcome.providerUsed },
    };
  }
}
