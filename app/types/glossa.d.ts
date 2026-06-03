// Ambient types mirroring the Glossa data model (reference/data-model.md).
// No imports/exports here on purpose — that keeps these globally available.

interface LLMConfig {
  // Provider-agnostic: a Pydantic AI provider (openai | anthropic | google | …)
  // plus an optional base_url for OpenAI-compatible endpoints. The legacy
  // mode/endpoint fields were removed from the Glossa model — provider, model and
  // api_key_ref are now resolved directly.
  provider?: string | null
  base_url?: string | null
  model?: string | null
  api_key_ref?: string | null
  extra?: Record<string, unknown>
}

interface SpaceStats {
  source_count: number
  page_count: number
  last_ingest_at?: string | null
}

interface Space {
  id: string
  tenant_id: string
  name: string
  slug: string
  bucket_uri: string
  schema_path?: string
  llm_config?: LLMConfig
  stats?: SpaceStats
  created_at: string
  updated_at: string
}

interface FetchCallback {
  url: string
  method?: string
  headers?: Record<string, string>
  auth_ref?: string | null
}

type SourceStatusT = 'received' | 'ingesting' | 'done' | 'failed'

type IngestionModeT = 'push' | 'pull' | 'url' | 'upload'

interface Source {
  id: string
  space_id: string
  title: string
  ingestion_mode: IngestionModeT
  content_inline?: string | null
  fetch_callback?: FetchCallback | null
  external_uri?: string | null
  // For `upload` sources: storage-relative path of the raw uploaded file,
  // e.g. `assets/src-<id>/report.pdf`. Parsed to text on ingest.
  asset_path?: string | null
  metadata?: Record<string, unknown>
  status: SourceStatusT
  created_at: string
  last_ingested_at?: string | null
  last_ingest_job_id?: string | null
}

type PageKindT = 'entity' | 'topic' | 'summary' | 'synthesis' | 'comparison' | 'system' | 'custom'

interface Page {
  space_id: string
  path: string
  kind: PageKindT
  title: string
  frontmatter?: Record<string, unknown>
  source_refs?: string[]
  backlinks?: string[]
  size_bytes?: number
  updated_at?: string
  last_touched_by_job_id?: string | null
}

interface PageWithContent extends Page {
  content: string
}

interface JobResult {
  pages_created: string[]
  pages_updated: string[]
  contradictions_flagged: Record<string, unknown>[]
  lint_findings: Record<string, unknown>[]
  lint_summary: Record<string, number>
  log_entry?: string | null
}

type JobStatusT = 'queued' | 'running' | 'succeeded' | 'failed'

interface Job {
  id: string
  space_id: string
  kind: 'ingest' | 'lint' | 'reindex' | 'rebuild_index'
  inputs?: Record<string, unknown>
  status: JobStatusT
  result?: JobResult | null
  webhook_url?: string | null
  started_at?: string | null
  ended_at?: string | null
  error_message?: string | null
  created_at: string
}

interface CitedSource {
  id: string
  title: string
  external_uri?: string | null
}

interface QueryResponse {
  answer: string
  pages_consulted: string[]
  cited_pages: string[]
  cited_sources: CitedSource[]
  reasoning?: string | null
}

// Interactive chat over a Space's wiki — POST /spaces/{id}/chat(/stream).
type ChatRoleT = 'user' | 'assistant' | 'system'

interface ChatMessage {
  role: ChatRoleT
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  // Optional pasted material to discuss/compare against the wiki (not a durable
  // source unless the user asks to save it).
  context?: string | null
  max_pages?: number
  // When true, the agent may persist a compact note under notes/<slug>.
  allow_writes?: boolean
}

interface ChatToolEvent {
  name: string
  args?: Record<string, unknown> | string | null
  result?: string | null
}

interface ChatResponse {
  answer: string
  pages_consulted: string[]
  cited_pages: string[]
  cited_sources: CitedSource[]
  // Logical paths of notes the agent saved this turn (only when allow_writes).
  saved_pages: string[]
  tool_calls: ChatToolEvent[]
}

interface Webhook {
  id: string
  space_id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
}

interface UsageEvent {
  id: string
  tenant_id: string
  space_id: string
  job_id?: string | null
  operation: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  cost_usd: number
  created_at: string
}

interface UsagePeriodSummary {
  tenant_id: string
  period: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  event_count: number
  by_operation?: Record<string, unknown>
  by_model?: Record<string, unknown>
}

interface QuotaGauge {
  used?: number | null
  limit?: number | null
  remaining?: number | null
}

interface QuotaStatus {
  blocked: boolean
  [k: string]: unknown
}

interface TenantQuota {
  tenant_id: string
  monthly_cost_limit_usd?: number | null
  monthly_token_limit?: number | null
  allowed_models?: string[] | null
  max_sources_per_space?: number | null
  max_storage_bytes?: number | null
  max_requests_per_minute?: number | null
  notes?: string | null
  updated_at?: string
}

interface RequestEvent {
  id: string
  tenant_id?: string | null
  api_key_id?: string | null
  method: string
  path: string
  status_code: number
  duration_ms: number
  created_at: string
  error?: string | null
}

interface RequestActivitySummary {
  period_start: string
  period_end: string
  request_count: number
  error_count: number
  avg_duration_ms: number
  by_status?: Record<string, number>
  by_path?: Record<string, number>
}

type ScopeT = 'spaces:read' | 'spaces:write' | 'sources:write' | 'query' | 'lint' | 'admin'

interface ApiKey {
  id: string
  tenant_id: string
  prefix: string
  label?: string | null
  scopes: ScopeT[]
  created_at: string
  last_used_at?: string | null
  revoked_at?: string | null
}

interface ApiKeyIssued {
  api_key: ApiKey
  plaintext: string
}
