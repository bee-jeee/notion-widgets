// Shared fetch helper for widgets.
// Passes this page's ?key= on to /api.
window.widgetApi = async function (path, params = {}) {
  const key = new URLSearchParams(location.search).get("key") || "";
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`/api/${path}?${qs}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
};
