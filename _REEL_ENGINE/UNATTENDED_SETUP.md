# Unattended Reel Rendering — one-time setup, then forever hands-off

This is the permanent answer: a cloud runner renders every reel HTML → 1080×1920 MP4 with **no time limit and nobody recording anything.** You set it up once; after that every reel renders itself.

---

## Why this (and not my sandbox)

My sandbox caps each command at 45 seconds and kills background jobs; the reel plays ~88s in real time, so it can't finish a clean single pass in here. A GitHub Actions runner has **no time cap + full sudo**, so it installs Chromium properly and renders the whole reel in one flawless pass. Same `render.sh` — it just runs where it can breathe.

---

## One-time setup (~5 minutes)

1. **Make a dedicated private repo** named e.g. `rabbithole-reels`.
   - Put in it: the `_REEL_ENGINE/` folder, the `.github/` folder, and each reel folder (`MCP_Reel_01/`, etc.).
   - **Do NOT** put lead data / CSVs in it (the `.gitignore` blocks them as a safety net, but a clean dedicated repo is best).
2. **Push it to GitHub.**
3. Done. The workflow `Render Reel → MP4` is now live under the repo's **Actions** tab.

> Want me to drive the GitHub repo creation + first push in your browser? Say so — you stay signed in, I click through it.

---

## How to render a reel (every time)

**Manual (pick any reel):** Repo → **Actions** → *Render Reel → MP4* → **Run workflow** → fill in:
- `html`: `MCP_Reel_01/mcp_reel_visual.html`
- `seconds`: `90`
- `voice`: optional — `MCP_Reel_01/voice.mp3` to bake the Ivanna VO in; blank = silent video
- `out`: `MCP_Reel_01.mp4`

~3 minutes later the finished MP4 is a downloadable **artifact** on that run.

**Automatic:** every push that changes a `*_reel_visual.html` triggers a render automatically. So the loop becomes: I build the next reel → it's pushed → the MP4 renders itself.

---

## Fully end-to-end (the whole loop, per video)

1. Say: **"New reel: [topic] — guide at [URL]."**
2. I build the reel + cover + script + caption from the template (locked brand/voice/format).
3. Push → **Actions renders the MP4** and the **ElevenLabs (Ivanna) voiceover is generated in the cloud and baked in** — nobody drops a voice file.
4. The same run **publishes the MP4 as a public GitHub Release** and **calls the Buffer API to schedule the post** (caption + channels + time) — no browser, no unzip, no upload.
5. I duplicate the ManyChat keyword automation (swap keyword + link).

Everything runs itself. The pipeline is: **one push → rendered, voiced, published, and scheduled.**

---

## Buffer scheduling (new GraphQL API) — one-time wiring

Buffer's new API (`https://api.buffer.com`, GraphQL) can schedule **video** posts. It does **not** accept file uploads — the video must sit at a **public URL**, which is why the workflow publishes each MP4 as a public GitHub **Release** asset and hands that URL to Buffer.

**One-time setup (you do these — they involve your login/keys, which I never touch):**

1. **Make the repo public** — GitHub repo → *Settings* → *General* → *Danger Zone* → **Change visibility → Public**. (Release assets are only publicly fetchable when the repo is public. No secrets live in the repo; lead CSVs are gitignored.)
2. **Get a Buffer API key** — `publish.buffer.com/settings/api` → verify your email (Buffer gates the key behind email verification) → **create an API key**.
3. **Add it as a GitHub secret** — repo → *Settings* → *Secrets and variables* → *Actions* → **New repository secret**, name it exactly **`BUFFER_TOKEN`**, paste the key.

**Every reel after that:** run *Render Reel → MP4* with `schedule = true`, set `due_at` (ISO-8601 UTC, blank = add to Buffer queue), and `services` (default `instagram,tiktok`). The run renders → voices → publishes the Release → schedules on Buffer automatically.

> `_REEL_ENGINE/post_to_buffer.mjs` is the poster: it resolves your org + channels, then runs the `createPost` mutation per channel with the public MP4 URL. Run it with `--dry-run` to preview targets without posting.

> Note: on some Buffer plans, Instagram/TikTok video may publish via **notification** (a reminder to tap "post") rather than fully automatic. If a channel rejects auto-publish, the script surfaces Buffer's exact error and you can flip `schedulingType` to `notification`.

---

## Cover image (auto, every reel)

The cover/thumbnail is generated automatically from each reel's **first slide** so the
thumbnail tells viewers the topic at a glance — no manual cover step.

- `_REEL_ENGINE/capture/capture_cover.js` screenshots the settled first slide → `cover.png`.
- The workflow publishes `cover.png` alongside the MP4 in the public Release.
- When scheduling, the cover URL is passed to Buffer as the video `thumbnailUrl`.

Because the **clean-capture fix and the cover step live in the template + workflow**, every
new reel built from `_TEMPLATE/` inherits both automatically: one clean pass (no double
intro) and a matching first-slide cover.

## Files in this kit
- `_REEL_ENGINE/capture/capture_reel.js` — headless recorder (Playwright); loads the reel in
  `#capture` mode so it holds on a blank frame and records exactly one clean pass (no autoplay
  tail / restart).
- `_REEL_ENGINE/capture/capture_cover.js` — first-slide cover grabber → `cover.png`
- `_REEL_ENGINE/capture/render.sh` — record → ffmpeg → MP4 (optional voice mux)
- `_REEL_ENGINE/capture/package.json` — deps
- `.github/workflows/render-reel.yml` — the unattended runner (render → voice → cover →
  public Release → optional Buffer schedule)
