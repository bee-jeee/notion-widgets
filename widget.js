// Shared helpers for widgets.
// Passes this page's ?key= on to /api.
(function () {
  const key = new URLSearchParams(location.search).get("key") || "";

  async function call(path, params = {}, method = "GET") {
    if (method === "GET") {
      const qs = new URLSearchParams({ ...params, key });
      const res = await fetch(`/api/${path}?${qs}`);
      if (!res.ok) throw new Error(`${path} ${res.status}`);
      return res.json();
    }
    const qs = new URLSearchParams({ key });
    const res = await fetch(`/api/${path}?${qs}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  }

  window.widgetApi = (path, params) => call(path, params);
  window.widgetPost = (path, params) => call(path, params, "POST");

  // rerun fn when the tab is shown again
  window.onVisible = function (fn) {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) fn();
    });
  };

  // local YYYY-MM-DD
  window.ymd = function (d = new Date()) {
    const p = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
})();