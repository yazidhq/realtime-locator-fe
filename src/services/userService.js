const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem("authToken");
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
      ...(opts.headers || {}),
    },
    ...opts,
  });

  const bodyText = await res.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!res.ok) {
    const message = (body && (body.message || body.error || JSON.stringify(body))) || res.statusText;
    throw new Error(message);
  }

  return body;
}

export async function create(payload) {
  const body = await request(`/api/user/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body?.data || body;
}

export async function update(id, payload) {
  const body = await request(`/api/user/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return body?.data || body;
}

export async function remove(id) {
  if (!id) throw new Error("ID is required for delete");
  const body = await request(`/api/user/${id}`, {
    method: "DELETE",
  });
  return body?.data || body;
}

export async function getAll() {
  const body = await request(`/api/user/`, {
    method: "GET",
  });
  return body?.data || body;
}

export async function getAllFiltered(filters = {}, ops = {}) {
  const params = new URLSearchParams();
  Object.keys(filters || {}).forEach((k) => params.append(`filter[${k}]`, filters[k]));
  Object.keys(ops || {}).forEach((k) => params.append(`op[${k}]`, ops[k]));

  const query = params.toString();
  const path = query ? `/api/user/?${query}` : `/api/user/`;
  const body = await request(path, {
    method: "GET",
  });
  return body?.data || body;
}

export async function getById(id) {
  const body = await request(`/api/user/${id}`, {
    method: "GET",
  });
  return body?.data || body;
}

export default { create, update, remove, getAll, getById, getAllFiltered };
