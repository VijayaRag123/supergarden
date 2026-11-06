import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Fresh Market" },
      { name: "description", content: "Create your Fresh Market account." },
      { property: "og:title", content: "Sign up — Fresh Market" },
      { property: "og:description", content: "Create your Fresh Market account." },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <AuthForm mode="signup" />
      </div>
    </main>
  ),
});
