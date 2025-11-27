import userService from "../../services/userService";
import { UserContext } from "./userContext";

export const UserProvider = ({ children }) => {
  const handleCreate = async (payload) => {
    try {
      const res = await userService.create(payload);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleUpdate = async (payload) => {
    try {
      const res = await userService.update(payload);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleRemove = async (id) => {
    try {
      const res = await userService.remove(id);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleGetAll = async () => {
    try {
      const res = await userService.getAll();
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleGetAllFiltered = async (filters = {}, ops = {}) => {
    try {
      const res = await userService.getAllFiltered(filters, ops);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleGetById = async (id) => {
    try {
      const res = await userService.getById(id);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
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
