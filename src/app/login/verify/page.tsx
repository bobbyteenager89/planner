import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>We sent you a magic link. Click it to sign in.</p>
          <p className="mt-2 text-sm">
            If you don&apos;t see it, check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
