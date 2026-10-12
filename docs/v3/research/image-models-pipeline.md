# Image models and the art pipeline

> The recommendation is in [image-models.md](image-models.md). It wins where this file differs.

Research for spec section 5.5 and open decision 3. Research date: 2026-10-12. Prices were read on that date from the pages linked in "Sources". Anything marked **(unverified)** comes from a third-party page or could not be checked against the vendor's own page.

## Recommendation

No single model does the whole pipeline. Use one pay-as-you-go account per job and keep the cutting, colouring and checks in local scripts.

| Job | Main tool | Backup | Cost for the first playable |
|---|---|---|---|
| Style pick | Script that sends one prompt to 4 models, contact sheet on the iPad | Midjourney Basic for one month if nothing fits | about $3 |
| Rigged babies | Nano Banana Pro or gpt-image-2 for the master pose, then "peel by editing" with masked edits, SAM 3 masks, local compositing | Qwen-Image-Layered for a first split, vector layers (spec fallback) | about $10 to $25 |
| Word pictures | Nano Banana 2.1 on the Batch API with style reference images, local BiRefNet cut-out | gpt-image-2 with a native transparent background for white and pale objects, a FLUX.2 [klein] style LoRA if the style drifts | about $20 to $40 for 500 |
| Backgrounds | Nano Banana Pro at 2K, local upscale and crop to 2360 x 1640 | gpt-image-2 at a custom size of 2368 x 1648 | about $8 for 9 |

Accounts to open: **Google Gemini API** (prepaid, $5 minimum), **fal.ai** (prepaid, one key for SAM 3, Qwen-Image-Layered, BiRefNet, upscalers, FLUX.2, trainers) and **OpenAI API** ($5 minimum prepaid). That is about $20 of top-ups to start. The whole Year 1 set should stay under $150, retries included.

Run the 1-week trial in section 6 before committing. Style lock and rig cutting are the two risks, and both are cheap to test.

## 1. What the pipeline needs from a model

| Need | Why it is hard |
|---|---|
| Lock one painted style from a reference image | Most models drift towards their own default look over hundreds of images |
| Same baby across 35 breeds and 2 growth stages | Breeds share one rig (spec 2.7), so the art must line up pixel for pixel, not just "look like the same character" |
| Rig layers with hidden parts painted in | No hosted model makes animation-ready layers of a non-human character. This needs a tool chain |
| Transparent cut-outs | Only a few models output real alpha |
| Edit an existing picture by instruction | Needed for breeds, growth stages and fixes. Most edit models shift pixels slightly |
| Large backgrounds | 2360 x 1640 is above the default size of most models |
| Driven by scripts | Every step must run headless from an agent |

## 2. Models compared

### 2.1 Generators and editors

| Model | Price per image (2026-10-12) | Style and character reference | Native alpha | Masked edit | Notes |
|---|---|---|---|---|---|
| **Gemini Nano Banana Pro** (`gemini-3-pro-image`) | $0.134 at 1K/2K, $0.24 at 4K. Batch: half | Up to 14 references (unverified for Pro, verified for 2.1) | No | No, prompt edits only | Best painted-style quality in the Gemini family. Good choice for the master baby and backgrounds |
| **Gemini Nano Banana 2.1** (`gemini-nano-banana-2.1`) | $0.0336 at 1K, $0.0504 at 2K. Batch: $0.0168 at 1K | Up to 14 references: 4 characters, 10 objects | No | No | Released 2026-10-06 (third-party date). Cheapest strong model for word pictures. Batch API is supported |
| Gemini 3.1 Flash Image | $0.067 at 1K | Same family | No | No | Shuts down 2026-10-29 (unverified). Skip |
| Gemini 2.5 Flash Image | $0.039 | | No | No | Shut down 2026-10-02. Skip |
| **gpt-image-2** (OpenAI) | Output only, 1024 x 1024: $0.006 low, $0.053 medium, $0.211 high. Batch: half. Reference images add input tokens | Several input images on `/v1/images/edits` | **Yes**, `background: "transparent"`, PNG or WebP. Preview since 2026-08-20 | Yes, but the mask is guidance, not exact | Custom sizes up to 3840 px edge, multiples of 16. Users report alpha at 252 to 254 instead of 255 and a thin halo |
| gpt-image-2.5 (Sunburst, Flare) | $30 per 1M output tokens. About $0.013 medium, $0.053 high at 1024 (unverified) | Several input images | Yes | Yes, guidance only | Sunburst is the "editing precision" model. No official per-image table yet |
| gpt-image-1-mini | $0.005 low, $0.011 medium, $0.036 high | Yes | Yes (older models had it) | Yes | Cheap fallback. gpt-image-1 retires 2026-10-23 (unverified) |
| **FLUX.2 [pro] / [max] / [flex]** (Black Forest Labs) | From $0.03 / $0.07 / $0.05. Pro edit from $0.045 | Up to 8 references by API | Not documented | No | Strong multi-reference. Positioned for photo realism, test the painted look |
| **FLUX.2 [klein] 4B** | From $0.014, +$0.001 per extra megapixel | Up to 4 references | No | No | Apache 2.0 open weights. Best base for a cheap **style LoRA** |
| FLUX.2 [klein] 9B | From $0.015. Fine-tuned endpoint (beta) same price | Up to 4 | No | No | FLUX Non-Commercial licence. Fine for a private family game |
| FLUX 3 Image | $0.048 at 1 MP, $0.100 at 2K | Up to 4 references (unverified) | Unknown | Unknown | Announced July 2026, API listed from about 2026-10-01. Too new to rely on |
| FLUX.1 Kontext [pro] / [max] | $0.04 / $0.08 | One image, edit by instruction | No | No | Superseded by FLUX.2 edit |
| **FLUX.1 Fill [pro]** | $0.05 | | No | **Yes, true masked inpainting** | Keeps every pixel outside the mask. Useful for rig repairs |
| **Qwen-Image-Edit-2511** (Alibaba, Apache 2.0) | $0.03 per megapixel on fal | Several inputs | No | No | "Mitigates image drift" and better character consistency. LoRA trainer on fal about $4 per 1,000 steps (unverified for 2511) |
| Seedream 5.0 Pro / Lite (ByteDance) | $0.045 to $0.075 (Pro), $0.031 (Lite) (all unverified, resellers disagree) | Up to 10 / 14 references | No | No | Good multi-view sheets per one guide. No official price page found |
| **Recraft V4 / V4 Styles** | $0.035 raster with a custom style. Create style $0.005. Remove background $0.01. Crisp upscale $0.004. Inpaint $0.04 | Custom style from reference images, reused by style ID | No (cut-out tool) | Yes (V3 inpainting) | The only API with a saved, reusable style object. Prepaid, non-refundable units |
| Ideogram 4.0 | $0.03 to $0.10. Transparent generation $0.03 to $0.42 (unverified) | Style reference | Yes (reported 2026-08-25, unverified) | Yes | Text-first model. Fallback for transparent objects |
| Midjourney V8.1 | $10 a month Basic, about 200 images (unverified) | `--sref`, `--cref`, moodboards | No | Web editor | **No official API.** Terms forbid automation (unverified). Web UI only, so only for the style pick |

### 2.2 Layers, cut-outs, inpainting and upscaling

| Tool | Price | Headless | What it is good for |
|---|---|---|---|
| **SAM 3** (`fal-ai/sam-3/image`) | $0.005 per request | Yes, fal API | Masks from a text prompt ("mane", "tail", "horn", "leg") or points and boxes. Up to 32 masks per call |
| SAM 2 (local) | Free | Yes, Python on the Mac | Same with points and boxes, no text prompt |
| **BiRefNet** (MIT) | Free locally. fal bills per compute second | Yes, `rembg` or `transformers` on the Mac | Background removal, the best open model in one third-party test |
| Bria RMBG 2.0 | $0.018 on fal (unverified) | Yes | BiRefNet derivative. Weights are CC BY-NC, fine for private use |
| Apple Vision foreground mask | Free | Yes, a small Swift script on macOS 14+ | Second opinion for cut-outs, no download |
| **Qwen-Image-Layered** | $0.05 per image on fal, 1 to 10 RGBA layers | Yes, fal API | Splits a picture into layers and fills what was behind. Layers are grouped by the model, not by your part list. Soft at low resolution. Fine edges (hair, mane) need manual masks. Its fal LoRA trainer is deprecated |
| See-through (SIGGRAPH 2026, Apache 2.0) | Free. HF Space allows about 1 to 2 runs a day | Locally only on an NVIDIA GPU. The Space can be called with `gradio_client` | Up to 23 inpainted body-part layers with draw order. **Built for anime humans.** A unicorn is outside its training, test before relying on it |
| LayerDiffuse | Free (ComfyUI), Runware API | ComfyUI only | Older SDXL/FLUX.1 method for native alpha. Superseded by gpt-image-2 transparency and cut-out models |
| **SeedVR2 upscale** (`fal-ai/seedvr/upscale/image`) | $0.001 per megapixel | Yes | Upscale backgrounds to 2360 x 1640 and above |
| ESRGAN | fal $0.00111 per compute second. Free locally | Yes | Simple 2x and 4x upscale. Real-ESRGAN runs on the Mac |
| Recraft crisp upscale | $0.004 | Yes | Cheap clean upscale |

Tjitse's Mac is an M3 Pro with 36 GB. BiRefNet, SAM 2, Real-ESRGAN and the Apple Vision mask run there for free. Qwen-Image-Layered needed about 65 GB of GPU memory in one test, so it runs on fal. See-through needs CUDA, so it runs on its HF Space or a rented GPU.

## 3. Accounts and cheap ways in

There is no free API tier for image models at the big vendors today. The cheap path is small prepaid top-ups.

| Provider | How you pay | Free credits | Minimum |
|---|---|---|---|
| Google Gemini API | Prepaid for new users, credit expires after 12 months ([billing](https://ai.google.dev/gemini-api/docs/billing), updated 2026-09-28) | **None for image models** (pricing page says "Not available") | $5 |
| Google Cloud trial | $300 for 90 days for new accounts, card required | The trial credit **cannot pay for the Gemini API in AI Studio**. Vertex AI use may be covered (unverified) | |
| OpenAI API | Prepaid credits, expire after 1 year | None | $5 |
| fal.ai | Prepaid credits, expire after 365 days. Pay only for successful outputs | Varies by promotion, 1 week to 1 year expiry. Reports of about $20 for new accounts (unverified) | Not published |
| Black Forest Labs | Prepaid, 1 credit = $0.01 | None advertised | Not published |
| Recraft API | Prepaid units, $1 per 1,000 units, non-refundable | None | Not published |
| Replicate | Pay as you go | None on the official page. "$500 free" claims are unverified | None |
| Hugging Face PRO | $9 a month | $2 of inference credits a month, 8x ZeroGPU quota | |
| Consumer apps for the style pick | ChatGPT, Gemini app (about 20 free Nano Banana 2 images a day, unverified), Midjourney Basic $10 a month | | |

Advice: start with $5 on Gemini, $10 on fal and $5 on OpenAI. Prepaid credit caps the spend. Use the Batch API on Gemini and OpenAI for every batch that can wait a few hours, which halves the price.

Licences: Emma's game is private and non-commercial, so non-commercial weights (FLUX.2 [klein] 9B, Bria RMBG 2.0) are allowed. Check this again if the game is ever shared.

## 4. Tool chains

### 4.1 The style pick

1. A script (`tools/art/style-pick.ts`) sends one prompt for the baby and one for the meadow background to Nano Banana Pro, gpt-image-2 (high), FLUX.2 [max] and Recraft V4. Four candidates each, 32 images, about $3.
2. The prompt is fixed text from spec 5.5: gouache or watercolour texture, warm outline in a darker shade of the fill, light from the top left, pastel base, big head, big eyes with two highlights, short legs, round body.
3. The script writes a contact sheet page at iPad size. Tjitse and Emma pick on the iPad.
4. If no candidate is right, Tjitse may try Midjourney Basic for one month by hand. Its picture then becomes the reference image for the API models.
5. **Reproduction test:** the winning image goes as a reference into the two cheapest production models (Nano Banana 2.1 and gpt-image-2) with 10 word pictures and 1 background. The style is locked only if those match. Otherwise pick the next candidate. A beautiful picture that no API model can repeat is no use.
6. Save a **style kit** in `art/style/`: the reference baby, the reference background, 6 approved word pictures, the prompt template and the palette. Every later prompt uses the kit.

### 4.2 Rigged baby unicorns

The rig needs aligned layers, not just a similar-looking character. Breeds change only coat pattern, markings, mane style and horn colour on the one rig (spec 2.7). So the hard work happens twice (baby and foal), and breeds are small masked edits on top.

1. **Master pose.** Nano Banana Pro or gpt-image-2 with the style kit, at 2K. The prompt asks for a rig-friendly pose: side view turned a little to the viewer, all four legs apart and visible, tail clear of the body, mane not covering the eyes, plain flat light grey background. Generate 10 to 20, pick one.
2. **Cut-out.** BiRefNet locally. Check the edge on a dark and a light background.
3. **Part masks.** SAM 3 with text prompts for head, mane, tail, horn, each leg, eye, cheek ($0.005 each). A person or a vision-capable agent fixes masks with points and boxes where needed.
4. **Peel by editing.** Each edit removes the front part and paints what was behind it:
   - "Same picture, remove the mane, show the neck and head under it."
   - "Remove the tail."
   - "Remove the two near legs, show the body and the far legs."
   The script pastes each result back only inside the dilated mask of the removed part. Everything outside stays the original pixels, so the layers stay aligned. FLUX.1 Fill [pro] does this natively. Nano Banana and gpt-image edits work too, because the paste-back hides their small drift.
5. **Cheaper tricks first.** The far legs can be copies of the near legs, darker and behind the body, as in classic cut-out animation. Closed eyes can be a painted lid over the open eye. This cuts the number of inpainted parts.
6. **Optional first split.** Run Qwen-Image-Layered ($0.05) on the master to see which parts it separates and fills well. Use its filled body as a starting point where it is clean. Do not rely on it for the part list.
7. **Greyscale colour layers.** A local script turns body, mane, tail and second-mane layers into greyscale: the shading and the warm outline become a shade layer, the alpha becomes the CSS mask. Fixed parts (eyes, horn shine, cheeks) stay in colour.
8. **Rig file.** The agent writes pivots and anchors into `rig.json` from the masks (neck root, tail root, hip and shoulder joints). It checks by animating the rig in the browser.
9. **Growth stage.** Edit the master: "same unicorn, a bit older, longer legs and mane". Repeat steps 2 to 8. Keep anchor names the same.
10. **Breeds.** Masked edits on the assembled rig image: a new mane shape inside the mane mask, star markings inside the body mask. The script takes the difference against the base layer as the new overlay layer. Horn colour is a CSS colour. A breed is then a small JSON entry plus 1 to 3 overlay layers.

Effort: the first baby is a week 1 spike with Tjitse watching. After that each breed is about 5 to 15 edits at $0.05 to $0.13, so 9 breeds x 2 stages is roughly $10 to $25.

What could fail: the mane and tail are soft painted shapes, and SAM masks of painted hair are rough. If the peel results do not line up after two days, use the spec fallback: draw the parts as simple vector shapes in the locked style, and use the generated master only as the guide.

### 4.3 Word pictures (500 first, 1,500 in Year 1)

1. **Prompt template.** "A [word], one single object, centred, filling most of the frame, in the style of the reference pictures, plain flat light grey background, no text, no shadow." The word list adds a short visual note where a word is ambiguous ("bat: the animal").
2. **Generate.** Nano Banana 2.1 on the Batch API at 1K, with 4 to 6 style kit pictures as references. 2 candidates per word: 1,000 images at $0.0168, about $17 for 500 words.
3. **Cut-out.** BiRefNet locally. White and pale objects (egg, snow, sheep, cloud) go to gpt-image-2 with a native transparent background instead, at medium quality ($0.053), or are generated on a darker background.
4. **Automatic checks.** A script checks alpha, how much of the frame the object fills, file weight, and that no text appears. A vision agent picks the better candidate of each pair and flags style drift against the kit.
5. **Contact sheet** per batch at iPad size for Tjitse, then the picture check with Emma (spec 5.5 step 6).
6. **Export.** 512 x 512 WebP, one atlas per area.
7. **If the style drifts** over hundreds of pictures, train a FLUX.2 [klein] style LoRA on 30 to 50 approved pictures (fal klein 9B base trainer, about $0.0086 per step, so under $10). Generate the rest at about $0.015 each. The LoRA is also the cheapest route for the full 1,500.

**Plurals.** Do not generate plural pictures. The game draws "two cats" or "three foxes" by placing 2 to 5 copies of the singular cut-out with a small change of size and angle. The count is then always exact, which also serves the maths ladder, and the -s and -es words need no extra art. The spec's plural step (section 3.2, items -s and -es) only needs the singular picture and the count.

### 4.4 Backgrounds (9 first, about 25 in Year 1)

1. Nano Banana Pro at 2K in a wide aspect, with the style kit background as reference. 4 to 6 candidates per place, about $0.80 per place.
2. gpt-image-2 can make 2368 x 1648 directly (sizes must be multiples of 16). Use it if Nano Banana's aspect ratios do not fit.
3. Upscale with SeedVR2 ($0.001 per megapixel) or Real-ESRGAN locally, then crop to 2360 x 1640.
4. Front layers for depth: SAM 3 mask of the front plants or fence, then an edit to fill what is behind, with the paste-back trick from 4.2.
5. Leave clear, calm space where babies stand and where word panels go. Put this in every background prompt.

## 5. What an agent can run headless

| Step | Headless | Where |
|---|---|---|
| Gemini, OpenAI, BFL, Recraft, fal generation and edits | Yes, REST API from a Node or Python script | Cloud |
| Batch jobs (Gemini, OpenAI) | Yes, submit and poll | Cloud |
| SAM 3, Qwen-Image-Layered, SeedVR2, LoRA training | Yes, fal queue API | Cloud |
| BiRefNet, SAM 2, Real-ESRGAN, greyscale, atlas packing, checks | Yes | Tjitse's Mac |
| See-through | Partly: HF Space via `gradio_client`, 1 to 2 runs a day | HF |
| Midjourney | No. Web UI only | Tjitse by hand |
| Picking the style, the picture check with Emma | No | Tjitse and Emma |

Keys: each provider key goes in `.env` next to `ELEVENLABS_API`, for example `GEMINI_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`. Scripts load `.env` themselves, the same rule as the audio generator. The game never calls an image API.

## 6. Trial before build week 1 (open decision 3)

| Day | Task | Cost |
|---|---|---|
| 1 | Open the three accounts. Run the style pick script. Contact sheet to Tjitse and Emma | about $3 |
| 2 | Reproduction test: 10 words and 1 background in Nano Banana 2.1 and gpt-image-2 from the winner | about $2 |
| 3 to 4 | Rig spike: master pose, SAM 3 masks, peel edits, paste-back, Qwen-Image-Layered comparison, one tweened rig in the browser | about $5 |
| 5 | 50 word pictures through the full chain with checks. Write down cost per accepted picture and time per batch | about $2 |

Write the results, the cost per accepted image and the licence of each chosen model into this file before the first real batch.

## Sources

All read on 2026-10-12.

- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Nano Banana 2.1 model page: https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1
- Nano Banana 2.1 release date (third party): https://letsdatascience.com/news/google-rolls-out-nano-banana-21-image-model-c6ac3b89
- Google Cloud free trial: https://docs.cloud.google.com/free/docs/free-cloud-features
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- OpenAI image generation guide (per-image tables, sizes, masks, 2.5 models): https://developers.openai.com/api/docs/guides/image-generation
- gpt-image-2 transparent backgrounds preview, 2026-08-20: https://community.openai.com/t/transparent-backgrounds-are-now-available-in-preview-for-gpt-image-2-in-the-api/1391541
- gpt-image-2.5 per-image estimates (unverified): https://tokencost.app/blog/gpt-image-2-5-pricing-cost-per-image
- OpenAI prepaid billing, $5 minimum: https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing
- gpt-image-1 retirement (unverified): https://pricepertoken.com/gpt-image-pricing
- BFL pricing: https://docs.bfl.ai/quick_start/pricing
- FLUX.2 overview (references, licences): https://docs.bfl.ai/flux_2/flux2_overview
- FLUX 3 announcement (third party): https://datanorth.ai/news/black-forest-labs-releases-flux-3
- BFL credits: https://docs.bfl.ai/quick_start/managing_account
- fal pricing and billing: https://fal.ai/pricing and https://fal.ai/docs/documentation/model-apis/pricing
- fal FAQ (credit expiry): https://fal.ai/docs/documentation/model-apis/faq.md
- Qwen-Image-Layered on fal: https://fal.ai/models/fal-ai/qwen-image-layered/llms.txt
- Qwen-Image-Layered limits: https://help.scenario.com/en/articles/qwen-image-layered-multi-layer-assets and https://lilting.ch/en/articles/qwen-image-layered-live2d-face-parts
- Qwen-Image-Layered trainer (deprecated): https://fal.ai/models/fal-ai/qwen-image-layered-trainer
- Qwen-Image-Edit-2511 on fal: https://fal.ai/models/fal-ai/qwen-image-edit-2511
- Qwen-Image-Edit trainer: https://fal.ai/models/fal-ai/qwen-image-edit-trainer
- SAM 3 on fal: https://fal.ai/models/fal-ai/sam-3/image
- BiRefNet on fal: https://fal.ai/models/fal-ai/birefnet/v2
- Background removal comparison and Bria licence (third party): https://aireiter.com/blog/best-background-removal-api
- SeedVR2 on fal: https://fal.ai/models/fal-ai/seedvr/upscale/image
- ESRGAN on fal: https://fal.ai/models/fal-ai/esrgan
- FLUX.2 trainers on fal: https://fal.ai/models/fal-ai/flux-2-trainer-v2 and https://fal.ai/models/fal-ai/flux-2-klein-9b-base-trainer
- See-through: https://github.com/shitagaki-lab/see-through and https://arxiv.org/html/2602.03749v1
- Recraft API pricing: https://www.recraft.ai/docs/api-reference/pricing
- Ideogram pricing (official page dated 2025) and 4.0 transparency (unverified): https://ideogram.ai/api-pricing/ and https://usagepricing.com/blueprint/activity/ideogram-2026-08-25-price-change
- Seedream 5.0 (unverified prices): https://help.artlist.io/hc/en-us/articles/37481273737757-Seedream-5-0-Pro and https://www.atlascloud.ai/fr/blog/ai-updates/seedream-5-0-pro-price
- Midjourney plans and API status (unverified): https://wavespeed.ai/blog/ja/posts/what-is-midjourney-v8-features-pricing-how-to-use-2026/ and https://unifically.com/blogs/midjourney-api
- Replicate pricing: https://replicate.com/pricing
- Hugging Face PRO: https://huggingface.co/pricing
- LayerDiffuse: https://runware.ai/models/layerdiffuse
