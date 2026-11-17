import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanRequest } from "@/lib/meal-plan";
import { planMeals } from "@/lib/ai/meal-plan.server";

/** Signed-in customers only, so the AI credits can't be used by anonymous traffic. */
export const getMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { request: string }) => {
    const request = cleanRequest(input?.request);
    if (!request) throw new Error("Please say or type what you need.");
    return { request };
  })
  .handler(async ({ data }) => planMeals(data.request));
