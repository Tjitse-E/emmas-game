# Image models: the cheapest legitimate routes for one private person

> The recommendation is in [image-models.md](image-models.md). It wins where this file differs.

Research for open decision 3 (spec section 5.5). Date: 2026-10-12. Prices were read on that date from the pages linked in each row. "Not verified" means the figure comes only from a third-party site or from memory, and must be checked at sign-up.

## Recommendation

1. **Style pick: about $5 to $10 through one OpenRouter account.** OpenRouter now has a separate image API with most of the models worth trying behind one key: Nano Banana 2.1, GPT Image 2 and 1 Mini, Recraft V4 Styles, Seedream 5.0, Qwen Image 3, FLUX.2 klein and FLUX 3. An agent script makes 20 baby and 20 background candidates per model for 4 or 5 models. Tjitse and Emma pick on a contact sheet. A web UI is not needed.
2. **Production of the bulk (word pictures, items, pins): FLUX.2 klein 4B.** It is Apache 2.0, takes up to 4 reference images, and costs almost nothing. Run it in this order: free on the Mac with mflux, free up to about 80 images a day on Cloudflare Workers AI, or about $0.002 per image on Runware. Lock the style with a LoRA trained on the picked reference plus 15 to 30 approved images (free on the Mac with mflux).
3. **Babies and backgrounds: a premium edit model only if klein fails the consistency test.** Nano Banana 2.1 through the Batch API ($0.0168 per 1K image) is the best value of the premium models: 14 reference images, and Google publishes the price. The babies are about 800 images for the first playable, so this costs about $15.
4. **Cut-outs on the Mac for free** with BiRefNet (for example through `rembg`). GPT Image models can also return a transparent background directly.

Expected spend: **about $10 to $25 for the first playable and $25 to $60 for year one**, most of it on the style trial and the babies. This is cheaper than the ElevenLabs Starter plan.

No image service sells a "1 dollar first month" plan with API access that I could verify. Cheap web subscriptions ($8 to $20 a month) give a web UI, not an API, so agents cannot drive them. Pay-as-you-go APIs are the equivalent of the ElevenLabs starter month: top up $5 to $15 and stop when it is gone.

## Volume assumed

Counts include rejects, about 2.5 tries per kept picture and more for the rig.

| Asset | First playable | Year one |
|---|---|---|
| Style trial (4 to 5 models x 40) | 200 | 200 |
| Word pictures (2.5 tries each) | 1,250 | 3,750 |
| Babies: base pose, fixed poses, layer fills and hidden parts | 800 (9 breeds x 2 stages) | 3,000 (35 x 2) |
| Items and pins | 500 | 1,500 |
| Backgrounds (10 tries each, made at about 1.5 MP, then upscaled to 2360 x 1640) | 90 | 250 |
| **Total generations** | **about 2,850** | **about 8,700** |

Plurals (decisions.md, "Plurals now") add almost no art. One clean cut-out of `fox` is placed two or three times in code for "foxes". Image models miscount objects, and code never does. Only irregular plurals (mouse and mice, sheep) need a second picture, and they are not part of the -s and -es target.

## Prices per image (1024 x 1024, about 1 MP)

| Route | Model | Price | Free to start | Source |
|---|---|---|---|---|
| Local Mac (M3 Pro, 36 GB) | FLUX.2 klein 4B, Z-Image Turbo, FLUX.1 schnell | $0, about 2 kWh of power per 3,000 images (estimate) | Free | [mflux](https://github.com/filipstrand/mflux) |
| Cloudflare Workers AI | FLUX.2 klein 4B | 26.05 neurons per 512 tile out, 5.37 per tile in: about 125 neurons with one reference, $0.0014 | 10,000 neurons a day, so about 80 images a day | [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| Cloudflare Workers AI | FLUX.1 schnell, 4 steps | about 58 neurons, $0.0006 | about 170 images a day | same |
| Cloudflare Workers AI | FLUX.2 klein 9B | $0.015 first MP + $0.002 per input MP | about 7 a day | same |
| Runware | FLUX.2 klein 4B | $0.0006 text only, $0.0019 with references | $2 credit with a business email | [model page](https://runware.ai/models/flux2-klein-4b), [pricing](https://runware.ai/pricing) |
| Runware | Seedream 5.0 Flash / Qwen Image 3.0 | $0.019 / $0.03 | same | [pricing](https://runware.ai/pricing) |
| DeepInfra | FLUX.1 schnell / FLUX.2 dev / FLUX.2 pro | about $0.002 (4 steps) / $0.01 / $0.015 | No free credit, card or prepay required | [pricing](https://deepinfra.com/pricing) |
| fal.ai | FLUX.1 schnell / FLUX.2 klein 4B / Z-Image Turbo | $0.003 / $0.005 / $0.005 per MP, rounded up to whole MP | Sign-up credit claimed by third parties, not verified | [schnell](https://fal.ai/models/fal-ai/flux/schnell), [klein](https://fal.ai/models/fal-ai/flux-2/klein/4b), [z-image](https://fal.ai/models/fal-ai/z-image/turbo) |
| fal.ai | Nano Banana / Nano Banana 2 / Pro | $0.0398 / $0.08 / $0.15 | same | [pricing](https://fal.ai/pricing) |
| Replicate | FLUX.1 schnell / FLUX.1 dev | $0.003 / $0.025 | "Select models free for a bit", then billing. New accounts prepay since July 2025 | [pricing](https://replicate.com/pricing), [billing](https://replicate.com/docs/topics/billing) |
| Together AI | FLUX.2 dev / Imagen 4 Fast / Qwen Image | $0.0154 / $0.02 / $0.0058 per MP | No free trial. First purchase at least $15 | [pricing](https://www.together.ai/pricing), [billing](https://docs.together.ai/docs/billing) |
| OpenAI API (also via OpenRouter) | GPT Image 1 Mini low / medium / high | $0.005 / $0.011 / $0.036, Batch API half | No | [image guide](https://developers.openai.com/api/docs/guides/image-generation), [pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI API | GPT Image 2 low / medium / high | $0.006 / $0.053 / $0.211 | No | same |
| Google Gemini API (also via OpenRouter) | Nano Banana 2.1 or 3.1 Flash Lite Image, 1K | $0.0336, Batch $0.0168 | **No free tier for image output in the API** | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Google Gemini API | Nano Banana 2 (3.1 Flash Image) 1K / Nano Banana Pro 1K-2K | $0.067 / $0.134, Batch $0.034 / $0.067 | No | same |
| Recraft API | V4 Styles with own style references | $0.035 + $0.005 style per request | No. $1 buys 1,000 units, no minimum, units do not expire | [API pricing](https://www.recraft.ai/docs/api-reference/pricing) |
| Recraft API | V4.1 Flash (no custom style) / remove background / crisp upscale | $0.007 / $0.01 / $0.004 | same | same |
| OpenRouter | Recraft V4 Styles, Seedream 5.0 Lite, Qwen Image 3, FLUX.2 klein 4B, FLUX 3 (1K) | $0.04 / $0.035 / $0.03 / $0.014 per MP / $0.048 | No. Credit top-up fee and minimum not verified | [image models API](https://openrouter.ai/api/v1/images/models) |
| Hugging Face Inference Providers | Passes provider prices through | Same as provider | Free users get no credits. PRO gets $2 a month | [pricing](https://huggingface.co/docs/inference-providers/pricing) |
| Black Forest Labs API | FLUX 3, FLUX.2 pro | from $0.048 / image (calculator default) | Not stated | [pricing](https://bfl.ai/pricing) |

Free credits that would matter, both not verified for this use:

- **Google Cloud $300 for 90 days** (card required, first-time customers). The terms say it "can't pay for Gemini API in AI Studio costs". Whether it covers Gemini image or Imagen on Vertex AI is not stated. If it does, it pays for the whole of year one. Check in the billing console before relying on it. [Source](https://docs.cloud.google.com/free/docs/free-cloud-features).
- **fal.ai sign-up credit** (third parties say about $20 with a business email). Not on fal's own pages.

## Total cost per route

Per-image prices from the table, at the volumes above. The babies are the only part where a cheap model may not be good enough, so the last two rows split them out.

| Route | First playable (2,850) | Year one (8,700) | Notes |
|---|---|---|---|
| All local on the Mac (klein 4B or Z-Image Turbo) | $0 | $0 | 25 to 40 hours of Mac time for the first playable, overnight runs |
| Cloudflare klein 4B, free tier only | $0 | $0 | 36 days of the daily allowance for the first playable. Paid: about $4 plus $5 a month for Workers Paid |
| Runware klein 4B with references | about $5.50 | about $17 | Minus $2 credit |
| fal klein 4B or Z-Image Turbo | about $15 | about $45 | Edit calls with input images may cost more, not verified |
| GPT Image 1 Mini medium, Batch API | about $16 | about $48 | Plus input tokens for references. Transparent background built in |
| Nano Banana 2.1, Batch API | about $48 | about $146 | Strongest reference handling (14 images) |
| Recraft V4 Styles | about $114 | about $350 | Only service with a "create style" step built for this |
| GPT Image 2 medium | about $150 | about $460 | |
| **Recommended mix:** trial $8, bulk local or Cloudflare, babies on Nano Banana 2.1 Batch, backgrounds upscaled locally | **about $10 to $25** | **about $25 to $60** | Babies: 800 then 3,000 images at $0.0168 |
| Same mix with everything on Nano Banana 2.1 Batch | about $55 | about $155 | If klein cannot hold the style at all |

## Running models on Tjitse's Mac

The Mac is an M3 Pro with 36 GB of memory. Nothing is installed yet (no mflux, Draw Things or ComfyUI).

| Tool | What it gives | Scriptable |
|---|---|---|
| [mflux](https://github.com/filipstrand/mflux) 0.22.0 (2026-10-08, MLX) | FLUX.1, FLUX.2 klein 4B and 9B, Z-Image, Qwen Image and 2.1, Krea 2, SeedVR2 upscaler. LoRA training for FLUX.2 klein and Z-Image | Yes, CLI and Python. Install: `uv tool install --upgrade mflux` |
| Draw Things (free Mac app) | Same model families, Core ML and Metal tuned, LoRA training in the app | Has a local HTTP and gRPC server. Official API docs not found, so not verified |
| ComfyUI | Node graphs, every model, BiRefNet nodes | Yes, HTTP API. Slower than MLX on Mac (not measured here) |

Speed on Apple Silicon. No source measured an M3 Pro directly, so these are estimates:

- FLUX.2 klein 4B at 1024 x 1024, 4 steps: 21 s inference, 32 s wall time on an M1 Max with mflux ([lilting.ch](https://lilting.ch/en/articles/flux2-klein-4b-mflux-iris-m1-max)). About 9 s at 512 x 512 for a 4-bit build ([model card](https://huggingface.co/ar9av/FLUX.2-klein-4B-mflux-4bit)). Estimate for the M3 Pro: **30 to 45 s per 1 MP image.**
- FLUX.1 schnell 1024: about 20 to 35 s on an M3 Pro 18 GB in Draw Things (one guide, [insiderllm.com](https://insiderllm.com/guides/stable-diffusion-mac-mlx/), not verified).
- FLUX.1 dev: 20 to 28 steps, so several minutes per image. Too slow for bulk.
- Qwen Image 2.1: about 46 GB peak at full precision, 78 s per image on an M5 Max ([mflux README](https://raw.githubusercontent.com/filipstrand/mflux/main/src/mflux/models/qwen21/README.md)). Needs `-q 8` on 36 GB and will take several minutes. Not for bulk.
- LoRA training of klein base 4B fits on 32 to 36 GB with `gradient_checkpointing` and `quantize: 8` (mflux docs). Hours, not minutes. Cloud alternative: fal charges $2 per FLUX LoRA training run ([source](https://fal.ai/models/fal-ai/flux-lora-fast-training)).

A one-hour benchmark settles the speed: install mflux, generate 10 images with klein 4B and 10 with Z-Image Turbo at 1024 x 1024, and time them.

## Licences

The game is private and non-commercial, so every model here is allowed. If v3 is ever sold or made public:

- **Apache 2.0, no limits:** FLUX.1 schnell, FLUX.2 klein 4B ([model card](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)), Qwen-Image. fal marks Z-Image Turbo "commercial use permitted".
- **Non-commercial weights:** FLUX.1 dev, FLUX.2 dev and klein 9B. The FLUX.1 dev licence allows "private entertainment, hobby projects" and says outputs may be used "for any purpose (including for commercial purposes)", but section 4 forbids "any commercial or production purposes" for data produced by the model ([licence](https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/LICENSE.md)). Through a paid API the provider holds the commercial licence.
- **Recraft free plan:** images belong to Recraft, appear in the public gallery and have no commercial licence ([pricing](https://www.recraft.ai/pricing)). The paid API does not have this limit.

## What is not verified

- Free sign-up credits at fal.ai and Replicate. Third-party sites give $5 to $500 and disagree.
- Whether Google's $300 trial covers Gemini or Imagen on Vertex AI.
- OpenRouter's top-up fee and minimum.
- Every Mac speed figure for the M3 Pro.
- Draw Things' scripting API.
- Whether cheap models (klein 4B, Z-Image) hold a gouache picture-book style across 35 breeds. Only the trial can show this.
