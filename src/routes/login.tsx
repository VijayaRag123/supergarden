import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Fresh Market" },
      { name: "description", content: "Log in to your Fresh Market account." },
      { property: "og:title", content: "Log in — Fresh Market" },
      { property: "og:description", content: "Log in to your Fresh Market account." },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <AuthForm mode="login" />
      </div>
    </main>
  ),
});
