import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Fresh Market" },
      { name: "description", content: "Create your Fresh Market account." },
      { property: "og:title", content: "Sign up — Fresh Market" },
      { property: "og:description", content: "Create your Fresh Market account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="border-t-4 border-primary pt-6">
        <AuthForm mode="signup" />
      </div>
    </main>
  ),
});
