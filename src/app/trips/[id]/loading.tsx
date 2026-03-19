import { Card, CardContent } from "@/components/ui/card";

export default function TripLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-stone-100 rounded animate-pulse mt-2" />
      </div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="h-4 w-64 bg-stone-100 rounded animate-pulse" />
            <div className="h-9 w-32 bg-stone-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="h-5 w-24 bg-stone-200 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-5 w-32 bg-stone-200 rounded animate-pulse mb-4" />
            <div className="h-9 bg-stone-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
