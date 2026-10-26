import { DS, queryDS, prop, emoji, guard, send, fail } from "../lib/notion.js";

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    const pages = await queryDS(DS.dday, {
      filter: {
        and: [
          { property: "표시", checkbox: { equals: true } },
          { property: "날짜", date: { is_not_empty: true } },
        ],
      },
      sorts: [{ property: "날짜", direction: "ascending" }],
    });

    const items = pages.map((p) => ({
      title: prop(p, "이름") || "(이름 없음)",
      icon: emoji(p),
      date: prop(p, "날짜").slice(0, 10),
      url: p.url, // open the notion page
    }));

    send(res, { items });
  } catch (err) {
    fail(res, err);
  }
}