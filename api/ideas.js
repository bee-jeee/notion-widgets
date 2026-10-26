import {
  DS, queryDS, prop, guard, send, fail, noStore,
  createPage, readBody, cleanStr, titleProp, selectProp,
  badInput, methodNotAllowed,
} from "../lib/notion.js";

const CATEGORIES = ["프로젝트", "블로그", "공부", "생활", "기타"];
const HIDDEN_STATUS = ["실행", "버림"];

async function get(res) {
  try {
    const pages = await queryDS(DS.ideas, {
      filter: {
        and: HIDDEN_STATUS.map((s) => ({
          property: "상태",
          select: { does_not_equal: s },
        })),
      },
      sorts: [{ property: "기록일", direction: "descending" }],
      page_size: 6,
    });

    const items = pages.map((p) => ({
      title: prop(p, "아이디어") || "(제목 없음)",
      category: prop(p, "분류"),
      status: prop(p, "상태"),
      url: p.url,
      created: prop(p, "기록일"),
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

  const category = body.category != null ? cleanStr(body.category, 50) : null;
  if (category && !CATEGORIES.includes(category)) return badInput(res, "category");

  try {
    const properties = {
      "아이디어": titleProp(title),
      "상태": selectProp("보관"),
    };
    if (category) properties["분류"] = selectProp(category);

    const page = await createPage(DS.ideas, properties);
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
