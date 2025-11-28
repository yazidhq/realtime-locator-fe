const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function getAuthHeader() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const params = options.params;
  let url = `${API_BASE}${path}`;

  if (params) {
    const qs = params instanceof URLSearchParams ? params.toString() : new URLSearchParams(params).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const fetchOptions = { ...options };
  delete fetchOptions.params;

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(fetchOptions.headers || {}),
    },
  });

  const body = await safeJson(res);

  if (!res.ok) {
    const msg = body?.message || body?.error || (typeof body === "string" ? body : JSON.stringify(body)) || res.statusText;

    throw new Error(msg);
  }

  return body?.data ?? body;
}

export default request;
