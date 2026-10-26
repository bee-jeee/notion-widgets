import {
  DS, queryDS, updatePage, prop, isYmd, guard, noStore, fail,
} from "../lib/notion.js";

const BATCH = 20; // logs per run

// Fill empty 데일리 on 작업 로그 rows
// with the 데일리 page of the same date.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!guard(req, res)) return;

  try {
    const logs = await queryDS(DS.logs, {
      filter: {
        and: [
          { property: "데일리", relation: { is_empty: true } },
          { property: "날짜", date: { is_not_empty: true } },
        ],
      },
      page_size: BATCH,
    });
    if (!logs.length) return noStore(res, { linked: 0, skipped: 0 });

    const dates = [...new Set(
      logs.map((l) => (prop(l, "날짜") || "").slice(0, 10)).filter(isYmd),
    )];

    // oldest page wins if a date has two
    const dailies = await queryDS(DS.daily, {
      filter: { or: dates.map((d) => ({ property: "날짜", date: { equals: d } })) },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
    });
    const byDate = new Map();
    for (const p of dailies) {
      const d = (prop(p, "날짜") || "").slice(0, 10);
      if (isYmd(d) && !byDate.has(d)) byDate.set(d, p.id);
    }

    let linked = 0;
    let skipped = 0;
    for (const log of logs) {
      const dayId = byDate.get((prop(log, "날짜") || "").slice(0, 10));
      if (!dayId) { skipped++; continue; } // no page yet, retry later
      await updatePage(log.id, { 데일리: { relation: [{ id: dayId }] } });
      linked++;
    }

    noStore(res, { linked, skipped });
  } catch (err) {
    fail(res, err);
  }
}