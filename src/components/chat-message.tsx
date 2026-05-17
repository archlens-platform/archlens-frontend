import { cn } from "@/lib/utils";
import { formatMarkdown } from "@/lib/markdown";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function formatChatMarkdown(text: string): string {
  return formatMarkdown(text, {
    h4: "font-semibold mt-1.5 mb-0.5",
    h3: "font-bold mt-2 mb-0.5",
  });
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-snug break-words overflow-hidden",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          content
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none [&_strong]:font-semibold [&_br]:my-0 [&_p]:my-0"
            dangerouslySetInnerHTML={{ __html: formatChatMarkdown(content) }}
          />
        )}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
        )}
      </div>
    </div>
  );
}
