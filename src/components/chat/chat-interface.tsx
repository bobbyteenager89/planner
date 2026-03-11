"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInterfaceProps {
  tripId: string;
  endpoint: string;
  initialMessages: Message[];
  placeholder?: string;
}

const COMPLETION_MARKER = "[ONBOARDING_COMPLETE]";

function stripCompletionMarker(text: string): string {
  return text.replace(COMPLETION_MARKER, "").trimEnd();
}

async function streamResponse(
  endpoint: string,
  body: Record<string, string>,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    onChunk(stripCompletionMarker(accumulated));
  }
}

function useChatMessages(initialMessages: Message[], endpoint: string) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text: string, extraBody?: Record<string, string>) {
    if (!text.trim() || isStreaming) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamResponse(
        endpoint,
        { message: text, ...extraBody },
        (accumulated) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: accumulated };
            return updated;
          });
        }
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return { messages, isStreaming, scrollRef, sendMessage };
}

function ChatInputBar({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input.trim());
        setInput("");
      }
    }
  }

  function handleSend() {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  }

  return (
    <div className="border-t p-4">
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none min-h-[44px] max-h-32"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          size="default"
          className="shrink-0"
        >
          Send
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Shift + Enter for new line
      </p>
    </div>
  );
}

export function ChatInterface({
  tripId: _tripId,
  endpoint,
  initialMessages,
  placeholder = "Type a message...",
}: ChatInterfaceProps) {
  const { messages, isStreaming, scrollRef, sendMessage } = useChatMessages(
    initialMessages,
    endpoint
  );

  const lastIsThinking =
    isStreaming && messages[messages.length - 1]?.content === "";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 pb-2">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const streaming = isLast && isStreaming && msg.role === "assistant";
          const thinking = streaming && lastIsThinking;
          return (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={thinking || streaming}
            />
          );
        })}
      </div>
      <ChatInputBar
        onSend={(text) => sendMessage(text)}
        disabled={isStreaming}
        placeholder={placeholder}
      />
    </div>
  );
}

// Extended version for onboarding — sends an initial path with the first message
export function ChatInterfaceWithPath({
  tripId: _tripId,
  endpoint,
  initialMessages,
  placeholder = "Type a message...",
  initialPath,
}: ChatInterfaceProps & { initialPath?: string }) {
  const { messages, isStreaming, scrollRef, sendMessage } = useChatMessages(
    initialMessages,
    endpoint
  );
  const didAutoSend = useRef(false);

  useEffect(() => {
    if (initialPath && !didAutoSend.current && initialMessages.length === 0) {
      didAutoSend.current = true;
      sendMessage("Let's start planning!", { path: initialPath });
    }
    // Only run once on mount / when initialPath first appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  const lastIsThinking =
    isStreaming && messages[messages.length - 1]?.content === "";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 pb-2">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const streaming = isLast && isStreaming && msg.role === "assistant";
          const thinking = streaming && lastIsThinking;
          return (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={thinking || streaming}
            />
          );
        })}
      </div>
      <ChatInputBar
        onSend={(text) => sendMessage(text)}
        disabled={isStreaming}
        placeholder={placeholder}
      />
    </div>
  );
}
