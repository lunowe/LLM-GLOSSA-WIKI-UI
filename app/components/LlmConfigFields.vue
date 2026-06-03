<script setup lang="ts">
// Provider + model picker for a Space, with only the fields the chosen provider
// needs. Keys/credentials live server-side; this UI just selects provider/model
// and the rare per-space override. `form` is a reactive object owned by the parent.
defineProps<{ form: LlmConfigForm }>()
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiField label="Provider" hint="Inference runs through Pydantic AI on the Glossa server.">
        <UiSelect v-model="form.provider" :options="LLM_PROVIDERS" />
      </UiField>
      <UiField label="Model" optional>
        <UiInput v-model="form.model" mono :placeholder="LLM_MODEL_PLACEHOLDER[form.provider]" />
      </UiField>
    </div>

    <!-- OpenAI / Anthropic: optional custom endpoint -->
    <UiField
      v-if="form.provider === 'openai' || form.provider === 'anthropic'"
      label="Base URL"
      optional
      hint="Custom or OpenAI-compatible endpoint (Azure, OpenRouter, Groq, Ollama, local…). Blank = provider default."
    >
      <UiInput v-model="form.base_url" mono placeholder="https://api.openai.com/v1" />
    </UiField>

    <!-- Bedrock: region (AWS credentials stay server-side) -->
    <UiField
      v-else-if="form.provider === 'bedrock'"
      label="AWS region"
      optional
      hint="Overrides the server's GLOSSA_AWS_REGION for this wiki. AWS credentials stay server-side."
    >
      <UiInput v-model="form.region" mono placeholder="us-east-1" />
    </UiField>

    <!-- Vertex: project + location (credentials stay server-side) -->
    <div v-else-if="form.provider === 'vertex'" class="grid gap-4 sm:grid-cols-2">
      <UiField label="GCP project" optional hint="Overrides GLOSSA_VERTEX_PROJECT.">
        <UiInput v-model="form.project" mono placeholder="my-gcp-project" />
      </UiField>
      <UiField label="Location" optional hint="Overrides GLOSSA_VERTEX_LOCATION.">
        <UiInput v-model="form.location" mono placeholder="us-central1" />
      </UiField>
    </div>

    <!-- Advanced: per-space key override (uncommon) -->
    <UiField
      label="API key override"
      optional
      hint='Usually leave blank — the server uses its configured key for this provider. To use a different key, reference a server env var, e.g. "env:CUSTOMER_42_KEY".'
    >
      <UiInput v-model="form.api_key_ref" mono placeholder="env:CUSTOMER_42_KEY" />
    </UiField>
  </div>
</template>
