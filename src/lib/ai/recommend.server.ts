import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import { fetchProducts } from "@/lib/shopify";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const schema = z.object({
  summary: z.string(),
  picks: z.array(z.object({ handle: z.string(), reason: z.string() })),
});

export type RecommendResult =
  | { ok: true; summary: string; picks: { handle: string; reason: string }[] }
  | { ok: false; error: string };

export async function recommendProducts(need: string): Promise<RecommendResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI is not configured yet." };

  const products = await fetchProducts(100);
  if (products.length === 0) {
    return { ok: false, error: "The store has no products yet, so there's nothing to recommend." };
  }
  const catalog = products.map((p) => ({
    handle: p.node.handle,
    title: p.node.title,
    type: p.node.description,
    price: `${p.node.priceRange.minVariantPrice.amount} ${p.node.priceRange.minVariantPrice.currencyCode}`,
  }));

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
      instructions:
        "You are a friendly greengrocer for an online fruit and vegetable shop. Recommend 1-6 products from the catalog that best match the shopper's need. Only use handles that exist in the catalog. Each reason is one short sentence. The summary is one or two short sentences.",
      messages: [
        { role: "user", content: `Catalog:\n${JSON.stringify(catalog)}\n\nShopper's need: ${need}` },
      ],
      output: Output.object({ schema }),
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
    const output = await result.output;
    const valid = new Set(catalog.map((c) => c.handle));
    return { ok: true, summary: output.summary, picks: output.picks.filter((p) => valid.has(p.handle)).slice(0, 6) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) return { ok: false, error: "Couldn't understand the suggestion. Please try again." };
    const status = (error as { statusCode?: number })?.statusCode;
    console.error("Recommendation failed:", error);
    if (status === 402) return { ok: false, error: "AI credits have run out. Please add credits to keep using recommendations." };
    if (status === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
    return { ok: false, error: "Recommendations are unavailable right now. Please try again later." };
  }
}
