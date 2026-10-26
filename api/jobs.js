import { DS, queryAll, prop, guard, send, fail } from "../lib/notion.js";

export default async function handler(req, res) {
  if (!guard(req, res)) return;
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