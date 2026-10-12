# Image models: the recommendation

For spec section 5.5 and open decision 3. Prices were checked on 2026-10-12 on the pages in the table and in "Sources". "Unverified" means only a third party gives the figure. This file wins where the three research files differ: [providers](image-models-providers.md), [pipeline](image-models-pipeline.md) and [cheap](image-models-cheap.md).

## The answer

**Model.** Google's Nano Banana family is the default. Nano Banana 2.1 makes the word pictures, items, pins and breed edits at $0.0168 per image on Google's Batch API. Nano Banana Pro makes the master baby and the backgrounds at $0.134 per image. GPT Image 2.5 Flare makes the white and pale objects, because it can output a real transparent background. Cut-outs, layer compositing, greyscale layers and checks run in local scripts on the Mac for free.

The week 1 style test confirms this or changes it. It pits Nano Banana 2.1 against GPT Image 2.5 Flare, Recraft V4 Styles and FLUX.2 klein 4B on one baby and one background. The winner must pass a reproduction test: from the chosen reference, it makes 10 word pictures and 1 background in the same style.

**What to buy first: $10 of OpenRouter credit.** OpenRouter is a prepaid account with one API key that reaches all four test models. There is no subscription. The card fee is 5.5% with a $0.80 minimum, so $10 costs $10.80. When the credit is gone, it stops. This is the nearest thing to the $1 ElevenLabs month. No image service sells a cheap first month that includes API access. Cheap image subscriptions ($8 to $20 a month) give a web app only, and agents cannot drive a web app.

After the test, open a Google Gemini API account with the $5 minimum prepay for production. The Batch API discount (half price) is only on Google's own API.

Free options exist but are small:

- Cloudflare Workers AI gives 10,000 free "neurons" a day on the free plan, about 80 FLUX.2 klein 4B images a day.
- The free Gemini and ChatGPT apps make images by hand. They are fine for exploring the style with Emma. The chosen image is then made again through the API, so the locked reference falls under the API terms.
- Recraft sells API credit in $1 packages that never expire. It only tests Recraft.
- The Gemini API has no free tier for image models. Google Cloud's $300 trial cannot pay for the Gemini API. Whether it covers Gemini on Vertex AI is unverified.

**What it costs.**

| Stage | Cost | What is in it |
|---|---|---|
| Style test (week 1) | about $5 | 4 models x 20 candidates, the reproduction test, the OpenRouter fee |
| First playable | about $55 to $75 | 1,000 word picture tries ($17), 500 item and pin tries ($8), 2 master babies and about 400 rig and breed edits ($15 to $30), 9 backgrounds x 6 tries ($7), pale objects ($2 to $6), the style test |
| Year one, in total | about $150 to $200 | 3,000 word picture tries ($50), 1,500 item tries ($25), 35 breeds x 2 stages ($45 to $90), 25 backgrounds ($20), pale objects and the style test ($10 to $20) |

If FLUX.2 klein 4B with a style LoRA (a small add-on model trained on approved pictures) holds the style, it makes the word pictures and items for free on the Mac or on Cloudflare. The first playable then costs about $30 to $50 and year one about $75 to $125. The three research files gave lower and higher totals because they assumed different volumes and models. The table above uses one set of volumes.

**Main risk.** Cutting a painted baby into aligned rig layers and painting the hidden parts (far legs, the body under the mane). No model does this directly. The pipeline method is "peel by editing": mask a part, ask the model to remove it and paint what is behind, and paste the result back only inside the mask. It is the week 1 spike. If it fails after two days, the spec fallback applies: draw the parts as simple vector shapes in the locked style. The second risk is style drift over hundreds of word pictures. The automatic check flags drift, and a style LoRA is the fix.

## Comparison

All prices are per image at about 1024 x 1024, read on 2026-10-12.

| Model | Price | Batch | Reference images | Transparent | How you pay | Source |
|---|---|---|---|---|---|---|
| Nano Banana 2.1 (`gemini-nano-banana-2.1`) | $0.0336. 2K $0.0504 | $0.0168 | Up to 14 | No | Google prepay, $5 minimum, credit expires after 12 months | [pricing](https://ai.google.dev/gemini-api/docs/pricing) (updated 2026-10-09), [billing](https://ai.google.dev/gemini-api/docs/billing) |
| Nano Banana Pro (`gemini-3-pro-image`) | $0.134 at 1K and 2K | $0.067 | Up to 14 (unverified for Pro) | No | As above | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| GPT Image 2.5 Flare | $30 per million output tokens. About $0.013 at medium quality (unverified, OpenAI publishes no per-image figure) | Half price | Up to 16 | Yes | OpenAI prepay, $5 minimum (unverified, help page returned 403), or OpenRouter | [pricing](https://developers.openai.com/api/docs/pricing), [estimate](https://tokencost.app/blog/gpt-image-2-5-pricing-cost-per-image) |
| GPT Image 2, medium | $0.053 | Half price | Several | Yes | As above | [image guide](https://developers.openai.com/api/docs/guides/image-generation) |
| Recraft V4 Styles | $0.035, plus $0.005 per request with reference images | No | 1 to 10, or a saved style | No (remove background $0.01) | $1 buys 1,000 units, no expiry, no refunds | [pricing](https://www.recraft.ai/docs/api-reference/pricing) |
| FLUX.2 klein 4B | $0.014 per megapixel (BFL, OpenRouter). Cloudflare about $0.0014. Free on the Mac | No | Up to 4 | No | BFL prepaid credits, or Cloudflare free daily allowance | [OpenRouter models](https://openrouter.ai/api/v1/images/models), [Cloudflare](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| OpenRouter (one key for all of the above) | Provider price plus 5.5% fee on top-ups ($0.80 minimum) | No | As the model | As the model | Prepaid, credit may expire after a year | [FAQ](https://openrouter.ai/docs/faq) |
| Midjourney | $10 a month (unverified) | n/a | Style reference | No | Subscription | No official API. Terms forbid automation. Not usable for the pipeline |

The arena leaderboard (2026-10-12) ranks GPT Image 2.5 first and Nano Banana 2.1 fourth, but it has no category for a painted picture-book style. Only the style test settles that.

## Licence and policy

- **Ownership.** Google does not claim ownership of generated images ([terms](https://ai.google.dev/gemini-api/terms), updated 2026-04-28). OpenAI assigns output to the user, but its terms page returned 403 today, so this is unverified for October 2026. Recraft's paid API is fine. Recraft's free web plan is not: those images belong to Recraft and are public.
- **Gemini's under-18 clause.** The Gemini API terms forbid use in an API client "directed towards or is likely to be accessed by individuals under the age of 18". Our API client is Tjitse's generation script. Emma never touches it, and the game never calls an image API. Emma only sees finished files. That reading is reasonable but it is Tjitse's call. If he does not accept it, GPT Image 2.5 Flare becomes the default at a similar price, with weaker character consistency. The clause also applies when Gemini is called through OpenRouter.
- **Open weights.** FLUX.2 klein 4B is Apache 2.0, with no limits. FLUX.2 klein 9B and FLUX.1 dev are non-commercial. That is fine for a private family game. Check again if the game is ever shared or sold.
- **Accounts.** Every provider requires the account holder to be 18 or older. Tjitse holds all accounts.
- **Prompts.** No trademarked characters and no artist names. Describe the style in plain words and pass the locked reference image. Write "foal", not "baby", in layer prompts that name body parts, to avoid false content flags.
- **Watermark.** Google images carry an invisible SynthID watermark. It does not affect the game.

## API key setup

1. Tjitse creates each key in the provider's dashboard and pastes it into `.env` himself, next to `ELEVENLABS_API`: `OPENROUTER_API_KEY` first, later `GEMINI_API_KEY`, and `OPENAI_API_KEY` or `FAL_KEY` only if needed.
2. Art scripts in `tools/art/` load the file themselves with `process.loadEnvFile()`, the same way as the audio generator. The command that runs them does not mention `.env`.
3. Agents never read, print, source, copy or edit `.env`. `.claude/settings.json` already denies the file.
4. The game never calls an image API, so no key reaches client code or git.
5. Prepaid credit caps the spend. Top up in small amounts ($10 at a time). Each script prints the cost of every batch from the API's usage field, so Tjitse sees the cost per batch.

## Plurals

Plurals need no plural pictures. Spec 5.5 adds about 10 singular pictures for plural words not already in the list. "Hats" or "a heap of hats" is 2 to 5 copies of the singular `hat` cut-out, placed in code with a small change of size and angle. The count is always exact. Image models miscount objects. Word pictures must therefore show one single object, centred, so copies stack well. Irregular plurals (mice, sheep) are not in the -s and -es steps. They would need their own picture if they come later.

## Week 1 trial

| Day | Task | Cost |
|---|---|---|
| 1 | Top up OpenRouter. A script makes 10 baby and 10 background candidates per model. Contact sheet on the iPad. Tjitse and Emma pick | about $4 |
| 2 | Reproduction test: 10 word pictures and 1 background from the winner in the two cheapest models | about $1 |
| 3 and 4 | Rig spike: master pose, cut-out, part masks, peel edits, paste-back, one animated rig in the browser | about $5 |
| 5 | 50 word pictures through the full chain with checks. Note cost and time per accepted picture. Try klein 4B on the Mac for the same 50 | about $2 |

Write the result, the cost per accepted picture and the licence of the chosen model into this file before the first real batch.

## Open points

- GPT Image 2.5 cost per image. Check the usage field on the first calls.
- OpenAI's $5 minimum and ID check for image models. Both come from forum reports.
- Whether Google Cloud's $300 trial pays for Gemini on Vertex AI.
- Free sign-up credit at fal.ai. Third parties say $1 to $20.
- FLUX.2 klein 4B speed on the M3 Pro. Estimated at 30 to 45 seconds per image.

## Sources

All read on 2026-10-12.

- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API billing (prepay, $5 minimum, updated 2026-09-28): https://ai.google.dev/gemini-api/docs/billing
- Gemini API terms: https://ai.google.dev/gemini-api/terms
- Google Cloud free trial: https://docs.cloud.google.com/free/docs/free-cloud-features
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- OpenAI image guide (per-image table for GPT Image 2, transparency, consistency note): https://developers.openai.com/api/docs/guides/image-generation
- GPT Image 2.5 per-image estimate (third party): https://tokencost.app/blog/gpt-image-2-5-pricing-cost-per-image
- Recraft API pricing: https://www.recraft.ai/docs/api-reference/pricing
- OpenRouter image models and endpoint prices: https://openrouter.ai/api/v1/images/models
- OpenRouter fees and credit expiry: https://openrouter.ai/docs/faq
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Arena leaderboard: https://artificialanalysis.ai/text-to-image/arena/leaderboard-text
- fal.ai sign-up credit (third party): https://www.costbench.com/software/ai-ml-platforms/fal/
