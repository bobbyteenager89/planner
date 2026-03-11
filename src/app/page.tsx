import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight">Planner</span>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight sm:text-6xl">
          Group trips,
          <br />
          without the drama
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          An AI mediator privately collects everyone&apos;s preferences, budget, and
          hard-no&apos;s — then builds an itinerary the whole group will love.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/login">
            <Button size="lg">Start Planning</Button>
          </Link>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        Built with AI that makes everyone feel heard.
      </footer>
    </div>
  );
}
