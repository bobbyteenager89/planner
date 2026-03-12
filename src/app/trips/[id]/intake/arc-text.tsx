export function ArcText({ text, id }: { text: string; id: string }) {
  const pathId = `${id}-arc-path`;
  return (
    <svg
      viewBox="0 0 200 60"
      className="mx-auto w-48"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={pathId} d="M 20,50 Q 100,0 180,50" fill="none" />
      </defs>
      <text
        fill="white"
        fontSize="16"
        fontWeight="800"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-outfit), sans-serif" }}
      >
        <textPath href={`#${pathId}`} startOffset="50%">
          {text.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
}
