import { DS, queryAll, prop, isYmd, guard, send, fail } from "../lib/notion.js";

// Minutes per day from 작업 로그 directly,
// so unlinked logs still count.
export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // client sends its local start date
  let from = req.query?.from;
  if (!isYmd(from)) {
    const d = new Date(Date.now() - 60 * 86400000);
    from = d.toISOString().slice(0, 10);
  }

  try {
    const logs = await queryAll(DS.logs, {
      filter: {
        and: [
          { property: "날짜", date: { on_or_after: from } },
          { property: "소요(분)", number: { is_not_empty: true } },
        ],
      },
    });

    const minutes = {};
    for (const l of logs) {
      const d = (prop(l, "날짜") || "").slice(0, 10);
      const m = Number(prop(l, "소요(분)")) || 0;
      if (isYmd(d) && m > 0) minutes[d] = (minutes[d] || 0) + m;
    }

    send(res, { from, minutes });
  } catch (err) {
    fail(res, err);
  }
}