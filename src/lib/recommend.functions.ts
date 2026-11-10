import { createServerFn } from "@tanstack/react-start";
import { recommendProducts } from "@/lib/ai/recommend.server";

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((input: { need: string }) => {
    const need = String(input?.need ?? "").trim().slice(0, 500);
    if (!need) throw new Error("Please describe what you need.");
    return { need };
  })
  .handler(async ({ data }) => recommendProducts(data.need));
