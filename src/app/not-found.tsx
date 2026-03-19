import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Page not found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The page you&#39;re looking for doesn&#39;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-stone-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
