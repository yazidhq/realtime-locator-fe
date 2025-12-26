import locationService from "../../services/locationService";
import { LocationContext } from "./locationContext";

export const LocationProvider = ({ children }) => {
  const handleGetHistoryByUserId = async (userId) => {
    try {
      const uid = String(userId || "").trim();
      if (!uid) throw new Error("userId is required");

      const data = await locationService.getHistoryByUserId(uid);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleCreate = async (payload) => {
    try {
      const data = await locationService.create(payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      const data = await locationService.update(id, payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleRemove = async (id) => {
    try {
      const data = await locationService.remove(id);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleGetAll = async (params) => {
    try {
      const data = await locationService.getAll(params);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleGetById = async (id) => {
    try {
      const data = await locationService.getById(id);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  return (
    <LocationContext.Provider
      value={{
        handleGetHistoryByUserId,
        handleCreate,
        handleUpdate,
        handleRemove,
        handleGetAll,
        handleGetById,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
