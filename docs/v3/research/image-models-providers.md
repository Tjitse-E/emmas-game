# Image model providers for v3

> The recommendation is in [image-models.md](image-models.md). It wins where this file differs.

Research date: 2026-10-12. Prices are in US dollars, excluding VAT. "Verified" means read on the provider's own page on that date. Everything else is marked **unverified** and comes from third-party sites. This file feeds open decision 3 in `spec.md`.

## Decision

Trial three models on one baby and one background, with a budget of about $15 in total:

1. **OpenAI GPT Image 2.5 (Flare)**. Top of the blind-vote leaderboard, native transparent backgrounds, and about $0.013 per 1024 px image at medium quality. $5 prepaid is enough for the trial.
2. **Google Nano Banana 2.1** (released 6 October 2026). Up to 14 reference images per call, which suits keeping one baby the same across poses. $0.034 per 1K image, half that in batch. $5 prepaid minimum. No transparency, so cut-outs need a background-removal step.
3. **Recraft V4 Styles**. Built to lock a style from 1 to 10 reference images. $0.035 per raster image, $0.05 per vector image, and API units are bought in $1 packages that never expire. The vector output is a fallback for rig layers (spec 5.5 already names vector shapes as plan B).

There is no image equivalent of the ElevenLabs $1 starter month. The cheap route is prepaid pay-as-you-go: $5 at OpenAI or Google, $1 at Recraft, any amount at Black Forest Labs. No provider gives a useful amount of free API credit. Alibaba gives 10 to 100 free images per model and Stability 25 one-time credits.

For the one-off style pick in a web UI, the free Gemini app and free ChatGPT both make images at no cost. Use them to explore, then regenerate the chosen candidate through the paid API so the locked reference was made under API terms.

## What one batch costs

Volumes from spec 5.5, with retries. First playable: about 500 word pictures, 9 breeds x 2 stages in fixed poses plus layer repaints, items and pins, 9 backgrounds and the style pick. Assume 2 tries per word picture and 3 per baby asset: about **2,000 generations**. Year 1 (1,500 words, 35 breeds, 25 backgrounds): about **7,000 generations**.

| Model | Per image (1K, standard quality) | First playable (~2,000) | Year 1 (~7,000) |
|---|---|---|---|
| GPT Image 2.5 Flare, medium | $0.013 | about $26 | about $90 |
| GPT Image 2.5 Flare, high | $0.053 | about $106 | about $370 |
| Nano Banana 2.1, batch | $0.017 | about $34 | about $120 |
| Nano Banana 2.1, standard | $0.034 | about $67 | about $235 |
| Recraft V4 Styles, raster | $0.035 | about $70 | about $245 |
| FLUX.2 [pro] | from $0.03 | about $60 | about $210 |
| Qwen-Image 3.0 | $0.03 | about $60 | about $210 |

Backgrounds at 2360 x 1640 cost more per image (see each provider). With 25 backgrounds and 5 candidates each, that adds $5 to $25 at most. Add $0.01 per cut-out if a background-removal API is used (Recraft's price). Free local tools like `rembg` also work.

## Comparison

| Provider | Best model now | Price per image | Minimum spend | Free credits | Transparent output | API |
|---|---|---|---|---|---|---|
| OpenAI | GPT Image 2.5 Sunburst / Flare (Sep 2026) | 1024 px: low $0.006, medium $0.013, high $0.053, xhigh $0.094. Batch half price | $5 prepaid (forum reports, unverified) | None | Yes | Yes |
| Google | Nano Banana 2.1 (Oct 2026) | 1K $0.034, 2K $0.050, 4K $0.113. Batch $0.017 / $0.025 / $0.057 | $5 prepaid | None on API for any image model | No | Yes |
| Black Forest Labs | FLUX 3 Image (Oct 2026), FLUX.2 | FLUX 3: 1K $0.048, 2K $0.100. FLUX.2 klein from $0.014, pro from $0.03, flex from $0.05, max from $0.07 | No stated minimum | None | Not documented | Yes |
| Recraft | V4.1, V4 Styles | V4 Styles $0.035 raster, $0.05 vector. V4.1 Flash $0.007. Style creation $0.005 | $1 packages | None on API | Via remove-background tool, $0.01 | Yes |
| Ideogram | Ideogram 4.5 | 4.0: $0.03 / $0.06 / $0.10. 4.5: $0.03 / $0.06 / $0.22 (unverified) | Unverified | None found | Yes on v3 (separate endpoint) | Yes |
| xAI | Grok Imagine Image 2.0 | $0.04 (quality model $0.05, base $0.02) | Unverified | About $25 promo on signup (unverified) | Not documented | Yes |
| Alibaba | Qwen-Image 3.0 | $0.03 at 1K and 2K. Pro: $0.04 at 1K, $0.075 at 2K | Pay-as-you-go | 10 images per Qwen 3.0 model, 50 to 200 for Wan models, valid 90 days (Singapore region) | Not documented | Yes |
| ByteDance | Seedream 5.0 Pro / Lite | Lite $0.035, Pro $0.045 to $0.09 (unverified) | Unverified | "Free inference trial quota", amount not stated | Not documented | Yes (BytePlus ModelArk) |
| Microsoft | MAI-Image-2.6 | $0.04 to $0.12 (sources conflict, unverified) | Azure account | Azure trial, not checked | Not documented | Yes (Foundry, preview) |
| Meta | Muse Image | $0.01 (unverified) | Unverified | Unverified | Not documented | Yes, Meta Model API may be US only. Also on fal |
| Stability AI | Stable Image Ultra | Ultra $0.08, Core $0.03 (unverified) | $10 top-up (unverified) | 25 one-time credits (unverified) | Not documented | Yes |
| Leonardo.ai | Own models plus resold ones | Not published per image | API billed apart from the app | $5 non-expiring starter credit (unverified) | Yes in the app | Yes |
| Midjourney | V8.x | Subscription from $10 a month | $10 a month | None | No | **No official API.** Terms forbid automation |
| Adobe Firefly | Firefly Image 5 | API only on enterprise contracts | Enterprise | None for individuals | n/a | Enterprise only |

Leaderboard (Artificial Analysis text-to-image arena, read 2026-10-12): 1 GPT Image 2.5 Sunburst, 2 GPT Image 2.5 Flare, 3 GPT Image 2, 4 Nano Banana 2.1, 5 Grok Imagine Image 2.0, 6 MAI-Image-2.6, 8 FLUX 3 Image, 9 Muse Image, 13 Nano Banana Pro. The arena has no "illustration" or "watercolour" category, so it says little about our picture-book style. Only the trial settles that.

## Provider notes

### OpenAI

- Current models: `gpt-image-2.5-sunburst` (precision, editing) and `gpt-image-2.5-flare` (fast default), released 8 September 2026. Both cost $30 per million image output tokens and $8 per million image input tokens. Batch is half price. `gpt-image-1` is reported to retire on 23 October 2026 (unverified).
- Per-image cost for 2.5 comes from token counts published by a third party (Kanaries, checked 2026-09-20): 1024 x 1024 low 196 tokens ($0.006), medium 439 ($0.013), high 1,756 ($0.053), xhigh 3,122 ($0.094). OpenAI's own table only covers GPT Image 2, where medium is $0.053. Check the `usage` field on the first real calls.
- Sizes: custom sizes in multiples of 16 up to 3840 px per edge. 2360 x 1640 is not a multiple of 16. Generate 2368 x 1648 and crop. Sizes above 2560 x 1440 are marked experimental, so a 1536 x 1024 render plus upscale is the safe path.
- Transparent background is supported on both 2.5 models (`background: transparent`, PNG or WebP). That removes the cut-out step for word pictures and items.
- Reference images: the edits endpoint takes several input images. OpenAI's own guide says the model "may struggle" to keep recurring characters consistent. The trial must test this on the baby in several poses.
- Moderation: `moderation: low` is available. Baby unicorns are no concern.
- Account: forum reports say image models need organization verification (an ID check). Unverified on an official page.
- Licence: OpenAI's terms assign output ownership to the user. The terms page returned 403 today, so this is from earlier knowledge and is unverified for October 2026.

### Google (Gemini API, AI Studio)

- Verified prices on ai.google.dev, last updated 2026-10-09: Nano Banana 2.1 (`gemini-nano-banana-2.1`) 1K $0.0336, 2K $0.0504, 4K $0.113. Batch $0.0168, $0.0252, $0.0567. Nano Banana 2 costs twice as much. Nano Banana Pro $0.134 at 1K and 2K. Nano Banana 2 Lite $0.0336 at 1K. Gemini 2.5 Flash Image was shut down on 2 October 2026.
- **The API free tier has no image models.** Every image model is marked "Free tier: Not available". AI Studio blogs that promise free daily images are out of date.
- Billing: new users are on Prepay, minimum $5 per purchase, credits expire after 12 months. The $300 Google Cloud trial credit explicitly excludes the Gemini API.
- Up to 14 reference images per call and consistency for up to 4 characters (Google's announcement, via secondary coverage). This is the strongest consistency feature on paper.
- No transparent output. Generate on a flat colour and remove the background.
- **Terms issue.** The Gemini API Additional Terms (updated 2026-04-28) say you may not use the Services in an API Client "that is directed towards or is likely to be accessed by individuals under the age of 18". Our generation scripts are run by Tjitse, and Emma only sees finished files, so the API client is not accessed by a child. That reading is reasonable but it is a judgement, not legal advice. OpenAI and the others have no such clause that I found.
- Google does not claim ownership of generated content. Images carry an invisible SynthID watermark.
- Consumer route: the free Gemini app makes images with Nano Banana 2 under a compute-based limit with no published count. Google AI Plus, Pro and Ultra get Nano Banana 2.1 (prices in the Netherlands not checked).

### Black Forest Labs (FLUX)

- 1 credit = $0.01. No subscriptions or seat fees. No stated minimum purchase (the $5 minimum is only for auto top-up). No free credits. BFL suggests $10 to $20 to start.
- FLUX 3 Image (`/v1/flux-3-image`): 768 px $0.041, 1K $0.048, 2K $0.100, 4K $0.607. Text-to-image, editing and multi-reference.
- FLUX.2: klein 4B from $0.014, klein 9B from $0.015, pro from $0.03 (editing from $0.045), flex from $0.05, max from $0.07 (first megapixel, extra megapixels cheaper).
- FLUX.1 Kontext pro $0.04 and max $0.08 still listed.
- `safety_tolerance` defaults to 2. No issue for unicorns.
- Terms (revised 2026-08-01): BFL claims no ownership of your content. They cover the site and playground. API use falls under separate Developer Terms that I did not read, so commercial rights for API output are unverified.
- Open weights: FLUX.2 klein 4B is Apache 2.0 and could run locally for free on a good GPU. Not tested here.

### Recraft

- Verified API prices: V4 Styles $0.035 raster, $0.05 vector, $0.10 pro raster (2K), $0.12 pro vector. V4.1 $0.035 raster, $0.08 vector. V4.1 Flash $0.007. Style references add $0.005 per request, creating a reusable style costs $0.005 once. Remove background $0.01, vectorize $0.01.
- API units: $1 = 1,000 units, any number of packages, units never expire, non-refundable. Closest thing to a "pay a dollar to test" option.
- V4 Styles (August 2026) defines a style from 1 to 10 reference images and holds every later generation to it, via a reusable `style_id`. This matches "locked to one style reference" directly.
- Vector output (SVG) could give clean, separable shapes for rig layers. Worth one test in the week 1 rig spike.
- Free web plan: images are public and owned by Recraft, no commercial licence. Do not use it for the locked reference. Paid web plans (terms of 2026-08-11) give full ownership. Web plan prices conflict between sources: Basic about $10 to $12 for 1,000 credits, Pro about $20 (unverified). Training on your images is on by default. Turn it off in settings.
- API ownership falls under separate Developer Terms (not read, unverified).

### Ideogram

- Strong at text in images, which we do not need (words sit in Andika on panels).
- Official API page lists 4.0 at $0.03 Turbo, $0.06 Default, $0.10 Quality. Ideogram 4.5 is in the app. Its API price of $0.03 / $0.06 / $0.22 is from a third party (unverified). Character reference costs more ($0.10 to $0.20 on v3).
- v3 has a transparent-background endpoint and `style_reference_images`.
- Web plans: Free (weekly slow credits), Plus $20 a month (2,400 credits), Pro $60 a month.

### xAI

- Verified API prices: `grok-imagine-image-2.0` $0.04, `grok-imagine-image-quality` $0.05, `grok-imagine-image` $0.02. Fifth on the arena.
- About $25 of promo credit for new accounts, expiring after 30 days (unverified).
- Grok had public controversy over sexualised image output in 2025 and 2026. It does not affect unicorn prompts, but it is the provider with the most reputational baggage for a children's project.

### Alibaba (Qwen-Image)

- Verified prices, Model Studio Singapore region: `qwen-image-3.0` $0.03 at 1K and 2K, `qwen-image-3.0-pro` $0.04 at 1K and $0.075 at 2K, `qwen-image-2.1-turbo` $0.016. Z-Image Turbo $0.015.
- Free quota per model, valid 90 days: 10 images for Qwen 3.0, 100 for Qwen 2.0, 50 to 200 for Wan models, 100 for Z-Image. Failed calls are free.
- Pro is reported to be rate limited to 1 request per minute (unverified). Too slow for 500 word pictures in one sitting.
- Qwen-Image open weights exist and rank well among open models.

### ByteDance (Seedream)

- Seedream 5.0 Lite about $0.035, Pro $0.045 to $0.09 per image on BytePlus ModelArk (unverified, sources conflict). Pro launched 8 July 2026.
- ModelArk advertises a free trial quota for new users without a published image count.
- Third on API volume at muapi.ai, not in the arena top 15.

### Microsoft (MAI-Image)

- MAI-Image-2.6 is sixth on the arena, public preview on Microsoft Foundry since 4 September 2026. Per-image price conflicts between sources ($0.04 to $0.12). Needs an Azure account. Not a good fit for a quick personal test.

### Meta (Muse Image)

- Ninth on the arena. API at $0.01 per image since late August 2026 (unverified). The Meta Model API preview is reported to be US only. fal.ai resells it at $0.01.

### Stability AI

- Stable Image Ultra $0.08, Core $0.03, SD 3.5 Large $0.065. 25 one-time credits for new API accounts (all unverified, the official page did not render). No longer near the top for quality.

### Leonardo.ai

- Mostly a web app with its own and resold models. API is billed apart from the subscription, with a $5 non-expiring starter credit. No published per-image rate. All unverified (site returned 403).

### Midjourney

- No official API. The terms forbid automated use, and third-party "Midjourney APIs" drive the Discord or web app and risk a ban. Plans start at $10 a month with no free trial (unverified). Usable only for the one-off style pick, by hand. Not suitable for the pipeline.

### Adobe Firefly

- Firefly API (Firefly Services) is sold only under enterprise contracts. Individual plans (from about $10 a month) are web and app only. Not suitable.

### Resellers with one key for many models

- **fal.ai** (verified prices): Nano Banana 2 $0.08, Nano Banana Pro $0.15, FLUX 3 Image edit $0.024 per megapixel, Muse Image $0.01. Signup credit amount is not published. Useful for testing Muse Image or FLUX 3 without a separate account. Google models cost more here than direct.
- **Replicate** (verified): FLUX 1.1 pro $0.04, Ideogram v3 Quality $0.09, Recraft V3 $0.04. Older models only on the pricing page.
- **OpenRouter** lists GPT Image 2 and MAI-Image-2.6 at token rates.

Direct accounts are cheaper for the three shortlisted models. Use a reseller only to try a model whose own provider is awkward to sign up for.

## Content policy for a children's unicorn game

- Prompts are baby unicorns, objects and landscapes. No provider's filter should block them. The only filter risk is words like "baby" next to body parts in layer-repaint prompts ("the body under the mane"). Phrase layer prompts as "foal".
- Every provider requires the account holder to be 18 or older. Tjitse holds the accounts. Emma never uses a provider.
- Gemini API's under-18 API Client clause is the one clause that needs a decision (see Google above).
- No trademarked characters (AGENTS.md). Never put "Disney", "My Little Pony" or an artist's name in prompts. Describe the style in plain words and use our locked reference image.

## Sources

All read on 2026-10-12.

- OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- OpenAI image generation guide: https://developers.openai.com/api/docs/guides/image-generation
- GPT Image 2.5 token counts (third party): https://docs.kanaries.net/articles/gpt-image-2-5
- GPT Image 2.5 launch coverage: https://evolink.ai/blog/gpt-image-2-5-flare-vs-sunburst
- OpenAI verification and $5 reports: https://community.openai.com/t/faq-getting-started-with-the-openai-api-quickstart-billing-verification-prepayment-credits-429-errors/1360980
- Gemini API pricing (updated 2026-10-09): https://ai.google.dev/gemini-api/docs/pricing
- Gemini API billing: https://ai.google.dev/gemini-api/docs/billing
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini API terms: https://ai.google.dev/gemini-api/terms
- Nano Banana 2.1 launch: https://letsdatascience.com/news/google-rolls-out-nano-banana-21-image-model-c6ac3b89
- Gemini app limits (third party): https://ai.zenken.co.jp/en/post/gemini-image-guide/
- BFL pricing: https://docs.bfl.ai/quick_start/pricing and https://bfl.ai/pricing
- BFL docs (credits, safety_tolerance): https://docs.bfl.ai/llms-full.txt
- BFL terms: https://bfl.ai/legal/terms-of-service
- Recraft API pricing: https://www.recraft.ai/docs/api-reference/pricing
- Recraft V4 Styles: https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles
- Recraft terms: https://www.recraft.ai/terms
- Recraft plans (third party): https://costbench.com/software/ai-image-generators/recraft/
- Ideogram plans: https://ideogram.ai/pricing/?pricing_tab=api
- Ideogram 4.5 API price (third party): https://www.wireflow.ai/docs/nodes/generate--ideogram_v4_5.md
- xAI models: https://docs.x.ai/docs/models
- xAI promo credits (third party): https://www.eesel.ai/en/blog/xai-pricing
- Alibaba Model Studio pricing: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- Seedream pricing (third party): https://evolink.ai/blog/seedream-pricing-guide-2026
- MAI-Image-2.6: https://openrouter.ai/microsoft/mai-image-2.6 and https://runtimewire.com/article/microsoft-mai-image-2-6-foundry-four-cents-image
- Muse Image: https://runtimewire.com/article/meta-ships-muse-image-api-at-one-cent-per-image
- Stability pricing (third party): https://www.costbench.com/software/ai-media-apis/stability-ai-api/
- Leonardo pricing (third party): https://eesel.ai/blog/leonardo-ai-pricing
- Midjourney API status (third party): https://unifically.com/blogs/midjourney-api
- Adobe Firefly API access: https://community.adobe.com/questions-404/i-can-t-manage-to-use-firefly-api-1474915
- Arena leaderboard: https://artificialanalysis.ai/text-to-image/arena/leaderboard-text
- fal.ai pricing: https://fal.ai/pricing
- Replicate pricing: https://replicate.com/pricing
