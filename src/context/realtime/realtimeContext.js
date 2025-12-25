import { createContext, useContext } from "react";

export const RealtimeContext = createContext(null);
export const useRealtime = () => useContext(RealtimeContext);

export default RealtimeContext;
