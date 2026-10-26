import {
  DS, queryAll, prop, guard, send, fail, noStore,
  createPage, getPage, updatePage, readBody, cleanStr, cleanUrl, isYmd,
  titleProp, dateProp, selectProp, multiSelectProp, badInput, methodNotAllowed,
  forbidden,
} from "../lib/notion.js";

const PLATFORMS = ["프로그래머스", "백준", "LeetCode", "기타"];
const LEVELS = ["Lv0", "Lv1", "Lv2", "Lv3", "Lv4", "Lv5", "브론즈", "실버", "골드", "플래티넘"];
const TYPES = ["구현", "해시", "정렬", "스택/큐", "그리디", "DFS/BFS", "DP", "이분탐색", "그래프", "문자열", "기타"];
const RESULTS = ["혼자 풂", "힌트 봄", "답 봄"];
const INTERVALS = [3, 7, 14];
const MAX_STEP = INTERVALS.length;

// local YYYY-MM-DD, no timezone shift
function fmtYmd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// null once review is finished (step >= MAX_STEP)
export function nextReviewDate(solved, step) {
  if (!isYmd(solved) || step >= MAX_STEP) return null;
  const [y, m, d] = solved.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + INTERVALS[step]);
  return fmtYmd(dt);
}

// today is the caller's "today" (client clock, not the server's)
export function isDue(solved, step, today) {
  const next = nextReviewDate(solved, step);
  return next !== null && today >= next;
}

async function get(res) {
  try {
    const pages = await queryAll(DS.coding);

    // memo stays out of the response
    const problems = pages.map((p) => ({
      id: p.id,
      title: prop(p, "문제") || "(제목 없음)",
      platform: prop(p, "플랫폼"),
      level: prop(p, "난이도"),
      types: prop(p, "유형") || [],
      result: prop(p, "결과"),
      solved: (prop(p, "푼 날짜") || "").slice(0, 10) || null,
      step: prop(p, "복습 단계") || 0,
      lastReview: (prop(p, "마지막 복습") || "").slice(0, 10) || null,
      link: prop(p, "링크") || p.url,
    }));

    send(res, { problems });
  } catch (err) {
    fail(res, err);
  }
}

async function create(res, body) {
  const title = cleanStr(body.title, 200);
  if (!title) return badInput(res, "title");
  if (!isYmd(body.date)) return badInput(res, "date");

  const platform = body.platform ? cleanStr(body.platform, 50) : "프로그래머스";
  if (!PLATFORMS.includes(platform)) return badInput(res, "platform");

  let level = null;
  if (body.level) {
    level = cleanStr(body.level, 50);
    if (!LEVELS.includes(level)) return badInput(res, "level");
  }

  let types = [];
  if (body.types != null) {
    if (!Array.isArray(body.types)) return badInput(res, "types");
    types = body.types.map((t) => cleanStr(t, 50));
    if (types.some((t) => !t || !TYPES.includes(t))) return badInput(res, "types");
  }

  const result = body.result ? cleanStr(body.result, 50) : "혼자 풂";
  if (!RESULTS.includes(result)) return badInput(res, "result");

  let link = null;
  if (body.link) {
    link = cleanUrl(body.link);
    if (!link) return badInput(res, "link");
  }

  try {
    const properties = {
      "문제": titleProp(title),
      "플랫폼": selectProp(platform),
      "결과": selectProp(result),
      "푼 날짜": dateProp(body.date),
      "복습 단계": { number: 0 },
    };
    if (level) properties["난이도"] = selectProp(level);
    if (types.length) properties["유형"] = multiSelectProp(types);
    if (link) properties["링크"] = { url: link };

    const page = await createPage(DS.coding, properties);
    noStore(res, { url: page.url });
  } catch (err) {
    fail(res, err);
  }
}

async function review(res, body) {
  const id = cleanStr(body.id, 200);
  if (!id) return badInput(res, "id");
  if (!isYmd(body.date)) return badInput(res, "date");

  try {
    const page = await getPage(id);
    // never touch a page outside the 코테 기록 data source
    if (page.parent?.data_source_id !== DS.coding) return forbidden(res);

    const step = Math.min((prop(page, "복습 단계") || 0) + 1, MAX_STEP);
    await updatePage(id, {
      "복습 단계": { number: step },
      "마지막 복습": dateProp(body.date),
    });
    noStore(res, { ok: true, step });
  } catch (err) {
    fail(res, err);
  }
}

async function post(req, res) {
  const body = readBody(req);
  if (body.action === "review") return review(res, body);
  return create(res, body);
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method === "GET") return get(res);
  if (req.method === "POST") return post(req, res);
  methodNotAllowed(res);
}
