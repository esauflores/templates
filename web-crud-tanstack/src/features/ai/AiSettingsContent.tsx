import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { AI_PROVIDERS, type AiProvider, MODELS_BY_PROVIDER } from "#/features/ai/data/models";
import { type AiConfig, loadAiConfig, saveAiConfig } from "#/features/ai/lib/ai";

export const AiSettingsContent = () => {
  const [cfg, setCfg] = useState<AiConfig>(loadAiConfig);
  const set = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));

  const models = MODELS_BY_PROVIDER[cfg.provider];
  const model = models.includes(cfg.model) ? cfg.model : models[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            Stored in your browser (<code>web:ai-config</code>). The <strong>mock</strong> provider streams scripted
            replies offline — wire a real one in <code>src/features/ai/lib/ai.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Provider</Label>
              <Select value={cfg.provider} onValueChange={(v) => set("provider", v as AiProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => set("model", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {cfg.provider !== "mock" && (
            <div className="grid gap-1.5">
              <Label htmlFor="ai-key">API key</Label>
              <Input
                id="ai-key"
                type="password"
                placeholder="sk-…"
                value={cfg.apiKey}
                onChange={(e) => set("apiKey", e.target.value)}
              />
            </div>
          )}
          {cfg.provider === "custom" && (
            <div className="grid gap-1.5">
              <Label htmlFor="ai-url">Base URL</Label>
              <Input
                id="ai-url"
                placeholder="https://…/v1"
                value={cfg.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-temp">Temperature</Label>
              <Input
                id="ai-temp"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={cfg.temperature}
                onChange={(e) => set("temperature", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-max">Max tokens</Label>
              <Input
                id="ai-max"
                type="number"
                min={64}
                step={64}
                value={cfg.maxTokens}
                onChange={(e) => set("maxTokens", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ai-system">System prompt</Label>
            <Textarea
              id="ai-system"
              rows={3}
              value={cfg.systemPrompt}
              onChange={(e) => set("systemPrompt", e.target.value)}
            />
          </div>

          <Button
            size="sm"
            className="w-fit"
            onClick={() => {
              saveAiConfig({ ...cfg, model });
              toast.success("AI settings saved");
            }}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
