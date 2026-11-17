import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import {
  MEAL_PLAN_INSTRUCTIONS,
  catalogForPrompt,
  mealPlanSchema,
  sanitizePlan,
  type MealPlan,
} from "@/lib/meal-plan";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
// The one place to change the model. Keep calls on Lovable's gateway (see AGENTS.md).
const MODEL = "openai/gpt-6-astra";

export type MealPlanResult = { ok: true; plan: MealPlan } | { ok: false; error: string };

export async function planMeals(request: string): Promise<MealPlanResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI is not configured yet." };

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: MEAL_PLAN_INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: `Catalog:\n${JSON.stringify(catalogForPrompt())}\n\nShopper's request: ${request}`,
        },
      ],
      output: Output.object({ schema: mealPlanSchema }),
      maxRetries: 0,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const plan = sanitizePlan(await result.output);
    if (plan.dishes.length === 0) {
      return {
        ok: false,
        error:
          "We couldn't find anything in our shops for that. Try describing a meal or listing items.",
      };
    }
    return { ok: true, plan };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error))
      return { ok: false, error: "Couldn't understand the suggestion. Please try again." };
    const status = (error as { statusCode?: number })?.statusCode;
    console.error("Meal plan failed:", error);
    if (status === 402)
      return { ok: false, error: "AI credits have run out. Please try again later." };
    if (status === 429)
      return {
        ok: false,
        error: "Too many requests right now. Please wait a moment and try again.",
      };
    return {
      ok: false,
      error: "The meal planner is unavailable right now. Please try again later.",
    };
  }
}
