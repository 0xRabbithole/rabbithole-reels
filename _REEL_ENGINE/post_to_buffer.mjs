#!/usr/bin/env node
/**
 * post_to_buffer.mjs — schedule a rendered reel onto Buffer via the new GraphQL API.
 *
 * Buffer API (beta): https://api.buffer.com  (GraphQL, Bearer token)
 * Media must live at a PUBLIC URL (Buffer does not accept file uploads) — we pass
 * the GitHub Release download URL of the rendered MP4.
 *
 * Auth:  env BUFFER_TOKEN  (a personal API key from publish.buffer.com/settings/api)
 *
 * Usage:
 *   node post_to_buffer.mjs \
 *     --video-url "https://github.com/OWNER/REPO/releases/download/TAG/reel.mp4" \
 *     --caption-file "MCP_Reel_01/caption.txt" \
 *     --services "instagram,tiktok" \
 *     --due-at "2026-06-22T17:00:00.000Z"      # omit --due-at to add to the queue instead
 *     [--thumb-url "https://.../cover.png"]      # optional video thumbnail
 *     [--scheduling-type automatic|notification] # default: automatic
 *     [--org "<organizationId>"]                 # default: first org on the account
 *     [--dry-run]                                # resolve + print, do NOT create posts
 *
 * Exit code is non-zero if any post fails, so CI fails loudly.
 */

const ENDPOINT = "https://api.buffer.com";
const TOKEN = process.env.BUFFER_TOKEN;

// ---- tiny arg parser -------------------------------------------------------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = process.argv[i + 1];
    if (next === undefined || next.startsWith("--")) { args[key] = true; }
    else { args[key] = next; i++; }
  }
}

function die(msg) { console.error("✗ " + msg); process.exit(1); }

if (!TOKEN) die("BUFFER_TOKEN env var is required (Buffer personal API key).");

const videoUrl = args["video-url"];
if (!videoUrl) die("--video-url is required.");

const thumbUrl = args["thumb-url"] || null;
const dueAt = args["due-at"] || null;          // ISO 8601; if null -> addToQueue
const schedulingType = args["scheduling-type"] || "automatic";
const services = String(args["services"] || "instagram,tiktok")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const dryRun = !!args["dry-run"];

// caption text: from --caption-file or --caption, else empty
import { readFileSync } from "node:fs";
let caption = "";
if (args["caption-file"]) caption = readFileSync(args["caption-file"], "utf8").trim();
else if (args["caption"]) caption = String(args["caption"]);

// ---- GraphQL helper --------------------------------------------------------
async function gql(query, label) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { die(`${label}: non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`); }
  if (data.errors) die(`${label}: ${JSON.stringify(data.errors)}`);
  return data.data;
}

// GraphQL string escaping for values we interpolate into the query text
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

// ---- main ------------------------------------------------------------------
const orgId = args["org"] || (async () => {
  const d = await gql(`query { account { organizations { id name } } }`, "account");
  const orgs = d?.account?.organizations || [];
  if (!orgs.length) die("No organizations on this Buffer account.");
  return orgs[0].id;
})();

const organizationId = typeof orgId === "string" ? orgId : await orgId;

const chData = await gql(
  `query { channels(input:{ organizationId:"${esc(organizationId)}" }) { id name displayName service isQueuePaused } }`,
  "channels"
);
const allChannels = chData?.channels || [];
const targets = allChannels.filter(c => services.includes(String(c.service).toLowerCase()));

if (!targets.length) {
  die(`No connected channels match services [${services.join(", ")}]. ` +
      `Available: ${allChannels.map(c => `${c.displayName}(${c.service})`).join(", ") || "none"}`);
}

console.log(`Organization: ${organizationId}`);
console.log(`Video URL:    ${videoUrl}`);
console.log(`Caption:      ${caption ? caption.slice(0, 80).replace(/\n/g, " ") + (caption.length > 80 ? "…" : "") : "(empty)"}`);
console.log(`Schedule:     ${dueAt ? `customScheduled @ ${dueAt}` : "addToQueue (next open slot)"}`);
console.log(`Targets:      ${targets.map(c => `${c.displayName}(${c.service})`).join(", ")}`);

if (dryRun) { console.log("\n--dry-run set → not creating posts."); process.exit(0); }

// build the assets[] entry: one video, optional thumbnail
const thumbPart = thumbUrl ? `, thumbnailUrl:"${esc(thumbUrl)}"` : "";
const assets = `[{ video: { url:"${esc(videoUrl)}"${thumbPart} } }]`;

// mode + dueAt
const modePart = dueAt
  ? `mode: customScheduled, dueAt: "${esc(dueAt)}"`
  : `mode: addToQueue`;

let failures = 0;
for (const ch of targets) {
  // Instagram requires a post type (post | story | reel) via network metadata.
  // We publish vertical video as a Reel. TikTok needs no extra metadata.
  const svc = String(ch.service).toLowerCase();
  const metaPart = svc === "instagram" ? `\n      metadata: { instagram: { type: reel } }` : "";
  const mutation = `mutation {
    createPost(input: {
      text: "${esc(caption)}"
      channelId: "${esc(ch.id)}"
      schedulingType: ${schedulingType}
      ${modePart}
      assets: ${assets}${metaPart}
    }) {
      ... on PostActionSuccess { post { id status dueAt } }
      ... on MutationError { message }
    }
  }`;
  const d = await gql(mutation, `createPost(${ch.displayName})`);
  const r = d?.createPost;
  if (r?.message) { console.error(`  ✗ ${ch.displayName}: ${r.message}`); failures++; }
  else if (r?.post?.id) { console.log(`  ✓ ${ch.displayName} → post ${r.post.id} (${r.post.status || "scheduled"})`); }
  else { console.error(`  ✗ ${ch.displayName}: unexpected response ${JSON.stringify(r)}`); failures++; }
}

if (failures) die(`${failures} post(s) failed.`);
console.log("\n✓ All posts created on Buffer.");
