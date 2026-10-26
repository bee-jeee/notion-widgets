// Notion helpers for /api functions
// token only in env (NOTION_TOKEN)

const NOTION_VERSION = "2026-03-11";

// ds ids aren't secret; env overrides
export const DS = {
  blocks: process.env.BLOCKS_DS || "c97db1ae-b1dd-4049-8523-17f0bf554343",
  daily: process.env.DAILY_DS || "5e810390-60f5-45a9-9a26-afd1efd8df6b",
  dday: process.env.DDAY_DS || "66202916-ad6e-48f9-98a9-73b2d4ddc31e",
};

export async function queryDS(id, body = {}) {
  const res = await fetch(`https://api.notion.com/v1/data_sources/${id}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100, ...body }),
  });
  if (!res.ok) {
    throw new Error(`notion ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.results;
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

// simple shared-key gate (?key=)
export function guard(req, res) {
  const want = process.env.WIDGET_KEY;
  if (!want) return true; // no key set = open (dev)
  if (req.query?.key === want) return true;
  res.status(401).json({ error: "unauthorized" });
  return false;
}

export function send(res, data) {
  // CDN cache 60s for rate limit
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(data);
}

export function fail(res, err) {
  console.error(err);
  res.status(502).json({ error: "notion_failed" });
}
