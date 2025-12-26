import request from "./index.js";

export const locationService = {
  create: (payload) =>
    request(`/api/location/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getHistoryByUserId: (userId) => {
    const uid = String(userId || "").trim();
    if (!uid) throw new Error("userId is required");

    return request(`/api/location/history`, {
      method: "GET",
      params: { user_id: uid },
    });
  },

  update: (id, payload) =>
    request(`/api/location/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  remove: (id) => {
    if (!id) throw new Error("ID is required for delete");
    return request(`/api/location/${id}`, { method: "DELETE" });
  },

  getAll: (params) => request(`/api/location/`, { method: "GET", params: params }),

  getById: (id) => request(`/api/location/${id}`, { method: "GET" }),

  getAllFiltered: (filters = {}, ops = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([k, v]) => params.append(`filter[${k}]`, v));
    Object.entries(ops).forEach(([k, v]) => params.append(`op[${k}]`, v));

    const qs = params.toString();
    return request(`/api/location/${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
};

export default locationService;
