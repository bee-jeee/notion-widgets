import {
  DS, queryDS, prop, emoji, guard, send, fail, noStore,
  createPage, readBody, isYmd, titleProp, dateProp, badInput, methodNotAllowed,
} from "../lib/notion.js";

async function get(req, res) {
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

async function post(req, res) {
  const body = readBody(req);
  if (!isYmd(body.date)) return badInput(res, "date");

  try {
    const existing = await queryDS(DS.daily, {
      filter: { property: "날짜", date: { equals: body.date } },
      page_size: 1,
    });
    if (existing.length) {
      return noStore(res, { url: existing[0].url, created: false });
    }

    // template fills body async; return right away
    const page = await createPage(DS.daily, {
      "이름": titleProp(body.date.replaceAll("-", ".")),
      "날짜": dateProp(body.date),
    }, {
      template: { type: "default" },
      timezone: "Asia/Seoul",
    });
    noStore(res, { url: page.url, created: true });
  } catch (err) {
    fail(res, err);
  }
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method === "GET") return get(req, res);
  if (req.method === "POST") return post(req, res);
  methodNotAllowed(res);
}
