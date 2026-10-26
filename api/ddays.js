import {
  DS, queryDS, prop, emoji, guard, send, fail, noStore,
  createPage, readBody, cleanStr, isYmd, titleProp, dateProp,
  badInput, methodNotAllowed,
} from "../lib/notion.js";

async function get(res) {
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

async function post(req, res) {
  const body = readBody(req);
  const title = cleanStr(body.title, 200);
  if (!title) return badInput(res, "title");
  if (!isYmd(body.date)) return badInput(res, "date");

  try {
    const page = await createPage(DS.dday, {
      "이름": titleProp(title),
      "날짜": dateProp(body.date),
      "표시": { checkbox: true },
    });
    noStore(res, { url: page.url });
  } catch (err) {
    fail(res, err);
  }
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method === "GET") return get(res);
  if (req.method === "POST") return post(req, res);
  methodNotAllowed(res);
}
