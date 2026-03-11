import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function IntakePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Share Your Preferences
          </h1>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>The AI intake conversation will be built in Phase 3.</p>
          <p className="mt-2 text-sm">
            For now, your participation has been recorded.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
