# Rabbithole Reel Engine — End-to-End Pipeline

The repeatable system for producing branded faceless explainer reels (Instagram / TikTok / YouTube Shorts). Hand Claude a topic and this runbook runs start to finish.

---

## ▶ How to start a new video (the only input needed)

> **"Claude, new reel: <topic> — guide at <URL>."**

That's it. Claude runs every step below. Example: *"New reel: what is an AI agent — guide at rabbithole.consulting/learn/agents."*

---

## 🔒 Standing rules (locked — never re-decide these)

**Brand**
- Font: **Inter Tight** (headlines, 800) + **Inter** (body) + JetBrains Mono (code/labels)
- Colors: ink `#0A0A0A` · white `#FFFFFF` · accent royal blue `#1D3A8A` · muted `#5A5F66`
- Signature: white-text-on-blue highlight box — use on the **2–3 punchiest words only**, blue text for the rest
- Logo: local `favicon-512.png` (the vortex), top-left header + CTA endcard. Travels in the project folder.
- Strike/negation = red `#E14B3C` (never blue over black)

**Format**
- 1080 × 1920 (9:16) — uploads clean to all three platforms
- Content centered in the safe band; bottom ~30% kept clear for caption/UI (toggle "safe zones" to check)
- Loading bar top-right, logo top-left

**Voice (locked)**
- **Ivanna — Young, Versatile and Casual** (ElevenLabs, ElevenCreative workspace)
- Model: Eleven Multilingual v2 · Speaker boost ON
- Energy preset to test: Stability ~35%, Style ~35%, Speed ~1.1–1.15
- Script written **one line per beat**, read tightened to fit the reel length

**Brand icons rule**
- Any named product (Chrome, YouTube, Claude, Stripe, Higgsfield, Notion…) ALWAYS shows its **official favicon**, never a placeholder dot.
- Source: `https://www.google.com/s2/favicons?domain=<DOMAIN>&sz=64` (verified accurate). Local PNG if a brand needs guaranteed/offline rendering.

**CTA pattern**
- Button: `Comment "<KEYWORD>"` → sub: "and we'll send you the <full> guide"
- Caption CTA + auto-DM keyword set to the same word
- Footer: "day X of 30 free AI kits"

---

## The pipeline (8 steps)

1. **Research** — Claude reads the guide URL, extracts the real teaching points (no invented facts).
2. **Script** — write the reel in 13ish beats + the line-per-beat voiceover (tightened to ~75–90s).
3. **Build reel** — copy `mcp_reel_visual.html` as the template; swap the content per the *Edit map* below. Keep all motion/structure.
4. **Voiceover (UI-driven)** — Claude drives ElevenLabs (steps below), voice = Ivanna, generates the take.
5. **Download MP3** — from the ElevenLabs player → Chrome Downloads. (Then move into the video's folder.)
6. **Align timings** — set each slide's `data-dur` proportional to its narration line so cuts land on the voice; total ≈ MP3 length.
7. **Caption + hooks** — write caption, comment-bait CTA, hashtags, 8–10 hook variants (see `CAPTION_hooks_hashtags.md`).
8. **Record + post** — screen-record the stage (9:16), lay the MP3 under it, post. (See "Recording" below.)

---

## Reel template — Edit map (what changes per video)

In the `.html`, only these change per video:
- **Chapter pills** — `<b>NN</b> / LABEL` (the section names)
- **Headlines** — the `<h1>` per beat; wrap the 2–3 hero words in `<span class="hl">` (box) or `<span class="bl">` (blue text)
- **Visuals per beat** — reuse the component library: flow diagram, self-typing terminal, vs-cards, count-up "math", node hub w/ favicons, checklist.md, two-card, CTA
- **Brand favicons** — the hub `<img class="d" src="…favicons?domain=…">` list
- **Durations** — `data-dur` on each `<section>` (step 6)
- **CTA keyword** — the button word + footer "day X of 30"
Everything else (fonts, colors, motion, header, loading bar, safe zones) stays.

---

## ElevenLabs (UI flow, since we're not using the API)

1. elevenlabs.io → **Text to Speech**
2. Paste the line-per-beat script
3. Voice → **My Voices → Ivanna**
4. Settings: Multilingual v2 · Speaker boost ON · Stability ~35% · Style ~35% · Speed ~1.1
5. **Generate** → audition → **Download** (MP3)
6. If too long: tighten the script (max speed alone won't fix it) and regenerate

> Claude runs steps 1–5 in the browser on command. You stay logged in.

---

## Recording the reel to video

The one step that isn't pure config:
- Open the `.html`, press **restart**, screen-record the **stage only** at 9:16 (QuickTime/CapCut/Screen Studio).
- Drop the MP3 under it, start both at frame one — they're built to the same length.
- Export 1080×1920, post.
> If you want this unattended later, we can add a headless capture (Playwright + ffmpeg) to render the HTML straight to MP4 — that's the only piece that would need a code step.

---

## Per-video output folder

Each video gets its own folder like `MCP_Reel_01/` containing:
- `*_visual.html` (the reel) + `favicon-512.png`
- `VOICEOVER_script.md`
- `SCRIPT_shotlist.md`
- `CAPTION_hooks_hashtags.md`
- the downloaded `.mp3`

---

## What's automated vs. manual (honest)

| Step | Status |
|---|---|
| Research, script, reel build, timing, caption | **Claude, automatic** |
| Voiceover generation | **Claude-driven in browser** (you stay logged in) |
| MP3 download | **Claude-driven** (lands in Downloads) |
| Screen-record + post | **Manual** (or add headless capture later) |

The locked rules above mean every video is consistent without re-litigating brand/voice/format.
