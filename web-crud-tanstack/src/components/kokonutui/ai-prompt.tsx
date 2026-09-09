"use client";

// Adapted from @kokonutui/ai-prompt (MIT, https://kokonutui.com) — trimmed to the
// essentials, re-themed to the design tokens, wired to a controlled model.

import { ArrowUp, Bot, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

interface AiPromptProps {
  models: string[];
  model: string;
  onModelChange: (model: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AiPrompt({
  models,
  model,
  onModelChange,
  onSubmit,
  placeholder = "Message the assistant…  (Enter to send, Shift+Enter for a newline)",
  disabled,
  className,
}: AiPromptProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 52, maxHeight: 220 });

  const send = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("rounded-2xl border bg-muted/40 p-2 focus-within:border-ring", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        className="min-h-13 resize-none border-none bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(e) => {
          setValue(e.target.value);
          adjustHeight();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="flex items-center justify-between px-1 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
              <Bot className="size-3.5" />
              {model}
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40">
            {models.map((m) => (
              <DropdownMenuItem key={m} className="justify-between gap-2" onSelect={() => onModelChange(m)}>
                {m}
                {m === model ? <Check className="size-4 text-primary" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          size="icon-xs"
          className="rounded-lg"
          disabled={!value.trim() || disabled}
          onClick={send}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
