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
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
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
