import { getRouteApi } from "@tanstack/react-router";
import { Check, Copy, Plus, RefreshCw, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AiPrompt } from "#/components/ai/ai-prompt";
import { EmptyState } from "#/components/crud/empty-state";
import { Button } from "#/components/ui/button";
import type { ChatMessage } from "#/features/ai/data/conversations";
import { MODEL_RATES, MODELS_BY_PROVIDER } from "#/features/ai/data/models";
import { estimateTokens, loadAiConfig, streamChat } from "#/features/ai/lib/ai";
import { useConversations } from "#/features/ai/lib/use-conversations";
import { cn } from "#/lib/utils";

const routeApi = getRouteApi("/_app/assistant");
const uid = () => crypto.randomUUID();

const md =
  "text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0 [&_a]:underline";

export const AssistantContent = () => {
  const { seed } = routeApi.useSearch();
  const { conversations, create, remove, setMessages } = useConversations();

  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [model, setModel] = useState(() => loadAiConfig().model);
  const [live, setLive] = useState<{ convId: string; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seededRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = live !== null;

  const providerModels = useMemo(() => MODELS_BY_PROVIDER[loadAiConfig().provider], []);
  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  const rendered: ChatMessage[] = useMemo(() => {
    const base = active?.messages ?? [];
    if (live && live.convId === activeId) return [...base, { id: "live", role: "assistant", content: live.text }];
    return base;
  }, [active, live, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [rendered]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Rough running usage for the whole visible thread — mock estimate, see `estimateTokens`.
  const usage = useMemo(() => {
    let inTok = 0;
    let outTok = 0;
    for (const m of rendered) {
      if (m.role === "user") inTok += estimateTokens(m.content);
      else outTok += estimateTokens(m.content);
    }
    const [inRate, outRate] = MODEL_RATES[model] ?? [0, 0];
    return { total: inTok + outTok, cost: (inTok * inRate + outTok * outRate) / 1_000_000 };
  }, [rendered, model]);

  const canRegenerate = !streaming && active?.messages.at(-1)?.role === "assistant";

  const startNew = () => setActiveId(create());

  const copy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  };

  // Stream a reply for `base` (the messages ending at the user turn) into `convId`.
  const runStream = async (convId: string, base: ChatMessage[]) => {
    setMessages(convId, base);

    const ac = new AbortController();
    abortRef.current = ac;
    setLive({ convId, text: "" });

    let acc = "";
    try {
      for await (const chunk of streamChat(base, { config: { ...loadAiConfig(), model }, signal: ac.signal })) {
        acc += chunk;
        setLive({ convId, text: acc });
      }
    } catch (err) {
      acc = `⚠️ ${err instanceof Error ? err.message : "Something went wrong"}`;
    } finally {
      setMessages(convId, [...base, { id: uid(), role: "assistant", content: acc || "_(stopped)_" }]);
      setLive(null);
      abortRef.current = null;
    }
  };

  const sendText = async (text: string) => {
    if (!text.trim() || streaming) return;

    let convId = activeId;
    if (!convId) {
      convId = create();
      setActiveId(convId);
    }

    const prior = conversations.find((c) => c.id === convId)?.messages ?? [];
    await runStream(convId, [...prior, { id: uid(), role: "user", content: text.trim() }]);
  };

  const regenerate = async () => {
    if (streaming || !activeId || !active) return;
    let end = active.messages.length;
    while (end > 0 && active.messages[end - 1].role === "assistant") end--;
    if (end === 0) return;
    await runStream(activeId, active.messages.slice(0, end));
  };

  // A `?seed=` param (from the prompt library "Use" action) auto-sends once.
  useEffect(() => {
    if (seed && !seededRef.current) {
      seededRef.current = true;
      void sendText(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <div className="flex h-[calc(100svh-8rem)] gap-4">
      <aside className="hidden w-56 shrink-0 flex-col gap-2 md:flex">
        <Button size="sm" variant="outline" className="justify-start" onClick={startNew}>
          <Plus /> New chat
        </Button>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                c.id === activeId && "bg-accent font-medium",
              )}
            >
              <span className="flex-1 truncate">{c.title}</span>
              <Trash2
                className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(c.id);
                  if (c.id === activeId) setActiveId(null);
                }}
              />
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-lg border">
        <div className="flex-1 overflow-y-auto p-4">
          {rendered.length === 0 ? (
            <EmptyState message="Ask about your customers, revenue, tickets — anything on the dashboard." />
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {rendered.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div>
                      <div className={md}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                      </div>
                      {m.id !== "live" && (
                        <button
                          type="button"
                          onClick={() => copy(m.id, m.content)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === m.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copiedId === m.id ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t p-3">
          {streaming ? (
            <div className="flex items-center justify-between rounded-2xl border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <span className="animate-pulse">Assistant is replying…</span>
              <Button type="button" size="sm" variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square /> Stop
              </Button>
            </div>
          ) : (
            <AiPrompt
              models={providerModels}
              model={model}
              onModelChange={setModel}
              onSubmit={(t) => void sendText(t)}
            />
          )}
          {rendered.length > 0 && (
            <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                ~{usage.total.toLocaleString()} tokens
                {usage.cost > 0 && ` · $${usage.cost.toFixed(4)}`}
              </span>
              {canRegenerate && (
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <RefreshCw className="size-3" /> Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
