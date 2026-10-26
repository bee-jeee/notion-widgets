import { DS, queryDS, prop, emoji, guard, send, fail } from "../lib/notion.js";

// 요일 option -> JS getDay() number
const DAY = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const HHMM = /^\d{1,2}:\d{2}$/;

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    const pages = await queryDS(DS.blocks, {
      filter: { property: "활성", checkbox: { equals: true } },
    });

    // client decides "today" with its own clock
    const blocks = pages
      .map((p) => ({
        name: prop(p, "블록") || "(이름 없음)",
        icon: emoji(p),
        start: (prop(p, "시작") || "").trim(),
        end: (prop(p, "끝") || "").trim(),
        tag: prop(p, "분류"),
        band: prop(p, "시간대"),
        days: (prop(p, "요일") || []).map((d) => DAY[d]).filter((n) => n !== undefined),
        progress: prop(p, "지금까지") || "",
        next: prop(p, "다음 할 일") || "",
      }))
      .filter((b) => HHMM.test(b.start) && HHMM.test(b.end));

    send(res, { blocks });
  } catch (err) {
    fail(res, err);
  }
}
