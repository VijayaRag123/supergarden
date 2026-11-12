import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Fresh Market" },
      { name: "description", content: "Log in to your Fresh Market account." },
      { property: "og:title", content: "Log in — Fresh Market" },
      { property: "og:description", content: "Log in to your Fresh Market account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="border-t-4 border-primary pt-6">
        <AuthForm mode="login" />
      </div>
    </main>
  ),
});
