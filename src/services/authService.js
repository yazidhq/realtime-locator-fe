import request from "./index.js";

export const authService = {
  login: ({ email, password }) =>
    request(`/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    request(`/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  refreshToken: (refresh_token) =>
    request(`/api/auth/refresh_token`, {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  logout: () =>
    request(`/api/auth/logout`, {
      method: "POST",
    }),
};

export default authService;
