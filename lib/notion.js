// Notion helpers for /api functions
// token only in env (NOTION_TOKEN)

const NOTION_VERSION = "2026-03-11";
const API = "https://api.notion.com/v1";

// ds ids aren't secret; env overrides
export const DS = {
  blocks: process.env.BLOCKS_DS || "c97db1ae-b1dd-4049-8523-17f0bf554343",
  daily: process.env.DAILY_DS || "5e810390-60f5-45a9-9a26-afd1efd8df6b",
  dday: process.env.DDAY_DS || "66202916-ad6e-48f9-98a9-73b2d4ddc31e",
  logs: process.env.LOGS_DS || "2c285625-c444-49b8-9937-34d018a691d3",
  jobs: process.env.JOBS_DS || "498f9553-085d-4d6e-87b3-71ad551468ab",
  ideas: process.env.IDEAS_DS || "5b5926d3-110d-4814-b24f-4de19262a363",
};

async function notion(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`notion ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// one page of results (max 100)
export async function queryDS(id, body = {}) {
  const json = await notion(`/data_sources/${id}/query`, "POST", {
    page_size: 100,
    ...body,
  });
  return json.results;
}

// follow cursors up to `max` rows
export async function queryAll(id, body = {}, max = 500) {
  const out = [];
  let cursor;
  do {
    const json = await notion(`/data_sources/${id}/query`, "POST", {
      page_size: 100,
      ...body,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    out.push(...json.results);
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor && out.length < max);
  return out;
}

export function updatePage(pageId, properties) {
  return notion(`/pages/${pageId}`, "PATCH", { properties });
}

export function createPage(dataSourceId, properties, extra = {}) {
  return notion("/pages", "POST", {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties,
    ...extra,
  });
}

// property value builders for createPage
export const titleProp = (s) => ({ title: [{ text: { content: s } }] });
export const textProp = (s) => ({ rich_text: [{ text: { content: s } }] });
export const dateProp = (s) => ({ date: { start: s } });
export const selectProp = (s) => ({ select: { name: s } });

// Vercel usually parses JSON into req.body; handle a raw string too
export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

// trimmed non-empty string, bounded length
export function cleanStr(v, max) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s && s.length <= max ? s : null;
}

export function cleanUrl(v, max = 500) {
  const s = cleanStr(v, max);
  return s && /^https?:\/\//i.test(s) ? s : null;
}

export function badInput(res, field) {
  res.status(400).json({ error: "invalid_input", field });
}

export function methodNotAllowed(res) {
  res.status(405).json({ error: "method_not_allowed" });
}

// read one property as a plain JS value
export function prop(page, name) {
  const p = page.properties?.[name];
  if (!p) return null;
  switch (p.type) {
    case "title":
    case "rich_text":
      return p[p.type].map((t) => t.plain_text).join("");
    case "select":
    case "status":
      return p[p.type]?.name ?? null;
    case "multi_select":
      return p.multi_select.map((o) => o.name);
    case "checkbox":
      return p.checkbox;
    case "number":
      return p.number;
    case "url":
      return p.url;
    case "date":
      return p.date?.start ?? null;
    case "created_time":
      return p.created_time;
    case "relation":
      return p.relation.map((r) => r.id);
    case "formula":
      return p.formula[p.formula.type] ?? null;
    case "rollup":
      return p.rollup.type === "array"
        ? p.rollup.array
        : p.rollup[p.rollup.type] ?? null;
    default:
      return null;
  }
}

export function emoji(page) {
  return page.icon?.type === "emoji" ? page.icon.emoji : null;
}

export const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// simple shared-key gate (?key=)
export function guard(req, res) {
  const want = process.env.WIDGET_KEY;
  if (!want) return true; // no key set = open (dev)
  if (req.query?.key === want) return true;
  res.status(401).json({ error: "unauthorized" });
  return false;
}

export function send(res, data) {
  // short CDN cache, still rate-safe
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
  res.status(200).json(data);
}

export function noStore(res, data) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(data);
}

export function fail(res, err) {
  console.error(err);
  res.status(502).json({ error: "notion_failed" });
}