# Provider compliance register

Direct development adapters are implemented for the configured providers. Their model catalogs are fetched from provider APIs; chat requests are sent only in non-production `provider-dev` mode after a prompt is submitted. Credentials remain server-side. The provider bills the account that owns the key; Think Zone does not charge credits or persist usage in this mode. Credentials do not establish permission to resell or bundle provider access. No commercial resale approval, provider-specific contract, or launch rate card is recorded here.

| Provider | Integration | Commercial status | Enabled | Notes |
|---|---|---|---|---|
| Think Zone demo adapter | Local deterministic mock | Development only; not a provider | Local mode only | Simulated response and usage; no network call |
| OpenAI | Direct development adapter | Pending review | Development only | Uses provider model listing and chat API; no Think Zone charge or durable usage |
| Anthropic | Direct development adapter | Pending review | Development only | Uses provider model listing and Messages API; no Think Zone charge or durable usage |
| Google Gemini | Direct development adapter | Pending review | Development only | Uses Gemini model listing and generation API; no Think Zone charge or durable usage |
| OpenRouter | Direct development adapter | Pending review | Development only | Lists text-output models; no Think Zone charge or durable usage |
| DeepSeek | OpenAI-compatible development adapter | Pending review | Development only | No Think Zone charge or durable usage |
| Groq | OpenAI-compatible development adapter | Pending review | Development only | No Think Zone charge or durable usage |
| xAI / Grok | OpenAI-compatible development adapter | Pending review | Development only | No Think Zone charge or durable usage |

Before enabling a provider for customer traffic, record official terms and contract references, permitted commercial use/resale, data handling and retention, geography/customer restrictions, usage-reporting behavior, verified rate source/date, approval owner, limitations, and last review date. A provider is not approved merely because its API is reachable. Development calls send prompts and associated request metadata to the selected provider.

## Current local catalog check

The configured local keys returned model catalogs for six providers. Google Gemini's model-list request returned HTTP 401, so its configured key or API access needs review. No generation prompt was submitted during this check. This result is specific to the current local environment and does not verify account billing, commercial authorization, or inference success.

## Integration references

- [AI SDK OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers)
- [OpenAI model list API](https://developers.openai.com/api/reference/resources/models/methods/list)
- [Anthropic model list API](https://docs.anthropic.com/en/api/models-list)
- [Gemini model list API](https://ai.google.dev/api/models)
- [OpenRouter models API](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [DeepSeek API compatibility guide](https://api-docs.deepseek.com/guides/codex)
- [Groq OpenAI compatibility](https://console.groq.com/docs/openai)
- [xAI inference API reference](https://docs.x.ai/developers/rest-api-reference/inference)
