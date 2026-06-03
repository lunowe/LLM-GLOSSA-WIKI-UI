// Shared helpers for the Space LLM config form (create + settings).
// Glossa runs all inference through Pydantic AI with five providers; each is keyed
// by its own GLOSSA_* setting on the server, so the UI never handles raw keys.

// The five providers Glossa supports (matches glossa/llm/models.py SUPPORTED_PROVIDERS).
export const LLM_PROVIDERS: { value: string; label: string }[] = [
  { value: 'openai', label: 'OpenAI / OpenAI-compatible' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'vertex', label: 'Google Vertex AI' },
]

// Example model id per provider, shown as the Model field placeholder.
export const LLM_MODEL_PLACEHOLDER: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-2.5-flash',
  bedrock: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  vertex: 'gemini-2.5-flash',
}

export function emptyLlmForm(): LlmConfigForm {
  return { provider: 'openai', model: '', base_url: '', api_key_ref: '', region: '', project: '', location: '' }
}

// Short label for a Space's configured LLM, for read-only display chips.
// Prefer the explicit model, fall back to the provider, then "default" — a wiki
// with no llm_config uses the server's GLOSSA_DEFAULT_LLM_PROVIDER/_MODEL, which
// the frontend can't see, so we must not imply a specific provider here.
export function llmSummary(cfg?: LLMConfig | null): string {
  return cfg?.model || cfg?.provider || 'default'
}

// Populate the flat form from a Space's stored llm_config (extra → flat fields).
export function loadLlmForm(cfg?: LLMConfig | null): LlmConfigForm {
  const f = emptyLlmForm()
  if (!cfg) return f
  f.provider = cfg.provider || 'openai'
  f.model = cfg.model || ''
  f.base_url = cfg.base_url || ''
  f.api_key_ref = cfg.api_key_ref || ''
  const extra = (cfg.extra || {}) as Record<string, unknown>
  f.region = (extra.region as string) || ''
  f.project = (extra.project as string) || ''
  f.location = (extra.location as string) || ''
  return f
}

// Build the llm_config payload for create/update — only the fields relevant to the
// chosen provider, with bedrock/vertex overrides folded into `extra`.
export function buildLlmConfig(f: LlmConfigForm): Record<string, unknown> {
  const llm: Record<string, unknown> = { provider: f.provider }
  if (f.model.trim()) llm.model = f.model.trim()
  if (f.api_key_ref.trim()) llm.api_key_ref = f.api_key_ref.trim()
  if ((f.provider === 'openai' || f.provider === 'anthropic') && f.base_url.trim()) {
    llm.base_url = f.base_url.trim()
  }
  const extra: Record<string, unknown> = {}
  if (f.provider === 'bedrock' && f.region.trim()) extra.region = f.region.trim()
  if (f.provider === 'vertex') {
    if (f.project.trim()) extra.project = f.project.trim()
    if (f.location.trim()) extra.location = f.location.trim()
  }
  if (Object.keys(extra).length) llm.extra = extra
  return llm
}

// True when the form differs from the server defaults (provider openai, nothing
// else set) — lets create() omit llm_config entirely so the server defaults apply.
export function llmFormIsCustomized(f: LlmConfigForm): boolean {
  return f.provider !== 'openai' || Object.keys(buildLlmConfig(f)).length > 1
}
