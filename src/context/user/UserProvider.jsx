import userService from "../../services/userService";
import { UserContext } from "./userContext";

export const UserProvider = ({ children }) => {
  const handleCreate = async (payload) => {
    try {
      const data = await userService.create(payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      const data = await userService.update(id, payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleRemove = async (id) => {
    try {
      const data = await userService.remove(id);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleGetAll = async () => {
    try {
      const data = await userService.getAll();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleGetById = async (id) => {
    try {
      const data = await userService.getById(id);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleGetAllFiltered = async (filters = {}, ops = {}) => {
    try {
      const data = await userService.getAllFiltered(filters, ops);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  return (
    <UserContext.Provider
      value={{
        handleCreate,
        handleUpdate,
        handleRemove,
        handleGetAll,
        handleGetById,
        handleGetAllFiltered,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
