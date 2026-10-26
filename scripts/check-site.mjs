import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const site = join(root, "site");

const expectedTitles = {
  "index.html": "Anime Card Farm Wiki: Codes, Packs, Cards &amp; Guides",
  "codes.html": "Anime Card Farm Codes (October 2026): Working List",
  "beginner-guide.html": "Anime Card Farm Beginner Guide (Oct 2026): Codes First, Then Farm",
  "packs.html": "Anime Card Farm Packs Guide (Oct 2026): Payback Before You Buy",
  "cards.html": "Anime Card Farm Cards Guide (Oct 2026): Weak-Slot Replace",
  "mutations.html": "Anime Card Farm Mutations Guide (Oct 2026)",
  "offline-money.html": "Anime Card Farm Offline Money Checklist (Oct 2026)",
  "updates.html": "Anime Card Farm Updates: CRAFT Signal & Public Tracker (Oct 2026)",
  "faq.html": "Anime Card Farm FAQ: Codes, Cards, Offline Money & CRAFT (Oct 2026)",
  "official-links.html": "Anime Card Farm Official Links: Game, Group & IDs (Oct 2026)",
  "crafting.html": "Anime Card Farm Crafting: Honest Limits (Oct 2026)",
  "about.html": "About — Anime Card Farm Wiki",
  "contact.html": "Contact — Anime Card Farm Wiki",
  "privacy.html": "Privacy Policy — Anime Card Farm Wiki",
  "terms.html": "Terms of Use — Anime Card Farm Wiki",
  "ads-disclosure.html": "Advertising Disclosure — Anime Card Farm Wiki",
  "editorial-policy.html": "Editorial Policy — Anime Card Farm Wiki",
  "source-methodology.html": "Source Methodology — Anime Card Farm Wiki",
  "es.html": "Wiki de Anime Card Farm: códigos y guía para empezar",
  "pt-br.html": "Wiki de Anime Card Farm: códigos e guia inicial",
  "id.html": "Wiki Anime Card Farm: kode dan panduan pemula",
  "vi.html": "Wiki Anime Card Farm: code và hướng dẫn người mới",
};

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "_next") continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

const errors = [];
const htmlFiles = walk(site).filter((p) => p.endsWith(".html"));

for (const file of htmlFiles) {
  const rel = relative(site, file);
  const html = readFileSync(file, "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  const flat = rel.endsWith("/index.html")
    ? `${rel.slice(0, -"/index.html".length)}.html`
    : rel;
  if (expectedTitles[flat] && title !== expectedTitles[flat]) {
    errors.push(`${rel} title changed: ${title}`);
  }
  if (!html.includes('href="/') && !html.includes("href='/")) {
    errors.push(`${rel} has no internal link`);
  }
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  if (/Last updated|Page last updated|Source set checked/i.test(visible)) {
    errors.push(`${rel} still has a visible freshness stamp`);
  }
  if (/gold-bar|static finale|RSC shell|RSC flight|illustrative placeholders/i.test(visible)) {
    errors.push(`${rel} still has dev or placeholder residue`);
  }
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of blocks) {
    try {
      JSON.parse(block[1]);
    } catch (err) {
      errors.push(`${rel} JSON-LD: ${err.message}`);
    }
  }
}

const sitemap = readFileSync(join(site, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length < 22) errors.push(`sitemap shrunk to ${locs.length}`);
if (!sitemap.includes("<lastmod>")) errors.push("sitemap lastmod removed");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok ${htmlFiles.length} html, ${locs.length} sitemap urls`);
