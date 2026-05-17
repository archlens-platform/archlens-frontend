"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import api from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function tryParseContent(text: string): string | null {
  if (!text.startsWith("{")) return null;
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    return typeof obj.content === "string" ? obj.content : null;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

const suggestions = [
  "What are the main scalability concerns?",
  "How can I improve the security of this architecture?",
  "Is there a single point of failure?",
  "What would you change to make this production-ready?",
];

function parseSSEContent(raw: string): string {
  const lines = raw.split("\n");
  const parts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ")) {
      const payload = trimmed.slice(6).trim();
      if (payload === "[DONE]") continue;
      const content = tryParseContent(payload);
      parts.push(content ?? payload);
    }
  }
  return parts.join("") || raw;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const currentMessages = [...messages, userMsg];
      const history = currentMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await api.post("/api/ai/api/chat", {
        analysis_id: id,
        question: question.trim(),
        history: history.slice(0, -1),
      });

      let content: string;
      if (typeof data === "string") {
        content = parseSSEContent(data);
      } else {
        content = data?.content ?? JSON.stringify(data);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I couldn't process your question (${message}). Please try again.` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-2 pb-4">
        <Link href={`/analyses/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Chat Follow-up</h1>
      </div>

      <ScrollArea className="flex-1 rounded-lg border p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
            <p className="text-sm">
              Ask questions about your architecture analysis
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left text-xs"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={`${msg.role}-${msg.content.slice(0, 30)}`}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && idx === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2 pt-3">
        <Textarea
          placeholder="Ask about your architecture..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          className="min-h-[2.5rem] resize-none"
          rows={1}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          size="icon"
          className="shrink-0"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
