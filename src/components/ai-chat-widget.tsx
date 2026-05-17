"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { extractResponseContent } from "@/lib/sse";
import type { SagaStatus, PagedResponse } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "What are the main scalability concerns?",
  "How can I improve security?",
  "Is there a single point of failure?",
  "Make this production-ready?",
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<SagaStatus[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [authed, setAuthed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const params = useParams();
  const pathname = usePathname();

  const analysisIdFromRoute =
    pathname.startsWith("/analyses/") && typeof params?.id === "string"
      ? params.id
      : null;

  const activeAnalysisId = selectedAnalysisId ?? analysisIdFromRoute;

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, [pathname]);

  useEffect(() => {
    if (analysisIdFromRoute && !selectedAnalysisId) {
      api.get<SagaStatus>(`/api/orchestrator/saga/diagram/${analysisIdFromRoute}`)
        .then(({ data }) => {
          if (data.analysisId) setSelectedAnalysisId(data.analysisId);
        })
        .catch(() => {});
    }
  }, [analysisIdFromRoute, selectedAnalysisId]);

  useEffect(() => {
    if (isOpen && recentAnalyses.length === 0) {
      api
        .get<PagedResponse<SagaStatus>>("/api/orchestrator/saga", {
          params: { page: 1, pageSize: 10 },
        })
        .then(({ data }) => {
          const completed = data.items.filter(
            (s) => s.currentState === "Completed"
          );
          setRecentAnalyses(completed);
          if (completed.length > 0 && !selectedAnalysisId) {
            setSelectedAnalysisId(completed[0].analysisId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, analysisIdFromRoute, recentAnalyses.length, selectedAnalysisId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isStreaming || !activeAnalysisId) return;

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

        const activeName = recentAnalyses.find(
          (a) => a.analysisId === activeAnalysisId
        )?.fileName ?? null;

        const { data } = await api.post("/api/ai/api/chat", {
          analysis_id: activeAnalysisId,
          question: question.trim(),
          history: history.slice(0, -1),
          diagram_name: activeName,
        });

        const content = extractResponseContent(data);

        setMessages((prev) => [...prev, { role: "assistant", content }]);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I couldn't process your question (${message}). Please try again.`,
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, activeAnalysisId, messages]
  );

  if (!authed) return null;

  return (
    <>
      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-4 z-[60] w-[400px] transition-all duration-300 ease-out ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-border/50 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold">ArchLens AI</h3>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-muted"
                  onClick={() => setMessages([])}
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsOpen(false)}
              >
              <X className="h-4 w-4" />
            </Button>
            </div>
          </div>

          {recentAnalyses.length > 0 && (
            <div className="relative border-b border-border/50 px-3 py-2">
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <span className="truncate">
                  {activeAnalysisId
                    ? recentAnalyses.find(
                        (a) => a.analysisId === activeAnalysisId
                      )?.fileName ??
                      `Analysis ${activeAnalysisId.slice(0, 8)}...`
                    : "Select analysis..."}
                </span>
                <ChevronDown
                  className={`h-3 w-3 shrink-0 transition-transform ${showSelector ? "rotate-180" : ""}`}
                />
              </button>
              {showSelector && (
                <div className="absolute left-3 right-3 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-lg border bg-background shadow-lg">
                  {recentAnalyses.map((a) => (
                    <button
                      key={a.analysisId}
                      type="button"
                      onClick={() => {
                        setSelectedAnalysisId(a.analysisId);
                        setShowSelector(false);
                        setMessages([]);
                      }}
                      className={`flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-muted ${
                        activeAnalysisId === a.analysisId
                          ? "bg-primary/10 text-primary"
                          : ""
                      }`}
                    >
                      <span className="truncate">
                        {a.fileName ?? `Analysis ${a.analysisId.slice(0, 8)}...`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <ScrollArea className="flex-1 overflow-hidden px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">How can I help?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ask questions about your architecture analysis
                  </p>
                </div>
                {activeAnalysisId && (
                  <div className="grid w-full gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        className="rounded-lg border border-border/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {!activeAnalysisId && (
                  <p className="text-xs text-muted-foreground">
                    Navigate to an analysis or select one above to start
                    chatting.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={`${msg.role}-${idx}-${msg.content.slice(0, 20)}`}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={
                      isStreaming &&
                      idx === messages.length - 1 &&
                      msg.role === "assistant"
                    }
                  />
                ))}
                {isStreaming &&
                  messages.at(-1)?.role === "user" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border/50 px-3 py-3">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder={
                  activeAnalysisId
                    ? "Ask about your architecture..."
                    : "Select an analysis first..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={!activeAnalysisId}
                className="min-h-[2.5rem] max-h-[5rem] resize-none rounded-xl text-sm"
                rows={1}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming || !activeAnalysisId}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 ${
          isOpen ? "rotate-0" : "animate-[pulse_3s_ease-in-out_infinite]"
        }`}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
