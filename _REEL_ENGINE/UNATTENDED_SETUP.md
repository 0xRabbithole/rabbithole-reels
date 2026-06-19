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
3. I drive ElevenLabs for the Ivanna VO → download → drop `voice.mp3` in the reel folder.
4. Push → **Actions renders the MP4 (with voice baked in)** → artifact ready.
5. I drive Buffer to schedule it with the cover + caption; I duplicate the ManyChat keyword automation (swap keyword + link).

The only thing that ever needs a human: approving "Go Live" on ManyChat and the Buffer schedule. Everything else runs itself.

---

## Files in this kit
- `_REEL_ENGINE/capture/capture_reel.js` — headless recorder (Playwright)
- `_REEL_ENGINE/capture/render.sh` — record → ffmpeg → MP4 (optional voice mux)
- `_REEL_ENGINE/capture/package.json` — deps
- `.github/workflows/render-reel.yml` — the unattended runner
