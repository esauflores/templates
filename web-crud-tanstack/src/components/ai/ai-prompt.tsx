"use client";

// Adapted from @kokonutui/ai-prompt (MIT, https://kokonutui.com) — trimmed to the
// essentials, re-themed to the design tokens, wired to a controlled model.

import * as stylex from "@stylexjs/stylex";
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

const styles = stylex.create({
  root: {
    backgroundColor: "color-mix(in oklch, var(--muted) 40%, transparent)",
    borderColor: "var(--border)",
    borderRadius: 16,
    borderStyle: "solid",
    borderWidth: 1,
    padding: 8,
  },
  textarea: { backgroundColor: "transparent", borderWidth: 0, minHeight: 52, paddingInline: 8, resize: "none" },
  controls: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    paddingBlockStart: 4,
    paddingInline: 4,
  },
  modelButton: { color: "var(--muted-foreground)", fontSize: 12, gap: 4, height: 28, paddingInline: 8 },
  bot: { height: 14, width: 14 },
  chevron: { height: 12, opacity: 0.5, width: 12 },
  menu: { minWidth: 160 },
  item: { gap: 8, justifyContent: "space-between" },
  check: { color: "var(--primary)", height: 16, width: 16 },
  send: { borderRadius: 8 },
});

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
    <div {...stylex.props(styles.root)} className={cn(stylex.props(styles.root).className, className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        {...stylex.props(styles.textarea)}
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
      <div {...stylex.props(styles.controls)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" {...stylex.props(styles.modelButton)}>
              <Bot {...stylex.props(styles.bot)} />
              {model}
              <ChevronDown {...stylex.props(styles.chevron)} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" {...stylex.props(styles.menu)}>
            {models.map((m) => (
              <DropdownMenuItem key={m} {...stylex.props(styles.item)} onSelect={() => onModelChange(m)}>
                {m}
                {m === model ? <Check {...stylex.props(styles.check)} /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          size="icon-xs"
          {...stylex.props(styles.send)}
          disabled={!value.trim() || disabled}
          onClick={send}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
