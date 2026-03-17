export default function ThanksPage() {
  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 sm:p-12 max-w-md text-center">
        <div className="text-5xl mb-4">🏔️</div>
        <h1 className="text-2xl font-extrabold text-stone-900 mb-2">
          You're all set!
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Thanks for voting — we'll use everyone's picks to build the
          schedule. Keep an eye out for the final itinerary!
        </p>
        <p className="text-stone-400 text-xs mt-6">
          Big Sky Family Trip · July 18–25, 2026
        </p>
      </div>
    </div>
  );
}
