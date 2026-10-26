import { DS, queryDS, prop, emoji, guard, send, fail } from "../lib/notion.js";

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const limit = Math.min(Number(req.query?.limit) || 14, 60);
  try {
    const pages = await queryDS(DS.daily, {
      filter: { property: "날짜", date: { is_not_empty: true } },
      sorts: [{ property: "날짜", direction: "descending" }],
      page_size: limit,
    });

    // no retro text: keep personal notes out
    const days = pages.map((p) => ({
      title: prop(p, "이름") || "",
      icon: emoji(p),
      date: prop(p, "날짜").slice(0, 10),
      condition: prop(p, "컨디션"),
      goal: prop(p, "목표 달성"),
      core: prop(p, "코어타임"),
      url: p.url,
    }));

    send(res, { days });
  } catch (err) {
    fail(res, err);
  }
}
