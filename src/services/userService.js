import request from "./index.js";

export const userService = {
  create: (payload) =>
    request(`/api/user/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    request(`/api/user/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  remove: (id) => {
    if (!id) throw new Error("ID is required for delete");
    return request(`/api/user/${id}`, { method: "DELETE" });
  },

  getAll: (params) => request(`/api/user/`, { method: "GET", params: params }),

  getById: (id) => request(`/api/user/${id}`, { method: "GET" }),

  getAllFiltered: (filters = {}, ops = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([k, v]) => params.append(`filter[${k}]`, v));
    Object.entries(ops).forEach(([k, v]) => params.append(`op[${k}]`, v));

    const qs = params.toString();
    return request(`/api/user/${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
};

export default userService;
