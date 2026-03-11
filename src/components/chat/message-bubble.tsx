"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  if (isStreaming && !content) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
          <div className="flex items-center gap-1">
            <span
              className="size-2 rounded-full bg-muted-foreground/50 animate-pulse"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="size-2 rounded-full bg-muted-foreground/50 animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-2 rounded-full bg-muted-foreground/50 animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground"
        }`}
      >
        {content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < content.split("\n").length - 1 && <br />}
          </span>
        ))}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 bg-current animate-pulse" />
        )}
      </div>
    </div>
  );
}
