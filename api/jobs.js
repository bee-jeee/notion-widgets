import {
  DS, queryAll, prop, guard, send, fail, noStore,
  createPage, readBody, cleanStr, cleanUrl, isYmd, titleProp, textProp,
  dateProp, selectProp, badInput, methodNotAllowed,
} from "../lib/notion.js";

const STAGES = ["관심", "지원", "서류 통과", "코테/과제", "면접", "최종 합격", "불합격", "보류"];

async function get(res) {
  try {
    const pages = await queryAll(DS.jobs);

    // memo stays out of the response
    const jobs = pages.map((p) => ({
      company: prop(p, "회사") || "(회사명 없음)",
      position: prop(p, "포지션") || "",
      stage: prop(p, "단계"),
      deadline: (prop(p, "마감일") || "").slice(0, 10) || null,
      applied: (prop(p, "지원일") || "").slice(0, 10) || null,
      link: prop(p, "공고 링크") || p.url,
    }));

    send(res, { jobs });
  } catch (err) {
    fail(res, err);
  }
}

async function post(req, res) {
  const body = readBody(req);
  const company = cleanStr(body.company, 200);
  if (!company) return badInput(res, "company");

  let position = "";
  if (body.position) {
    position = cleanStr(body.position, 500);
    if (!position) return badInput(res, "position");
  }

  const stage = body.stage ? cleanStr(body.stage, 50) : "관심";
  if (!STAGES.includes(stage)) return badInput(res, "stage");

  if (body.deadline && !isYmd(body.deadline)) return badInput(res, "deadline");

  let link = null;
  if (body.link) {
    link = cleanUrl(body.link);
    if (!link) return badInput(res, "link");
  }

  try {
    const properties = {
      "회사": titleProp(company),
      "단계": selectProp(stage),
    };
    if (position) properties["포지션"] = textProp(position);
    if (body.deadline) properties["마감일"] = dateProp(body.deadline);
    if (link) properties["공고 링크"] = { url: link };

    const page = await createPage(DS.jobs, properties);
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
