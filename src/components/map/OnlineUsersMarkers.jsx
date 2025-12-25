import { useEffect, useState } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { useAuth } from "../../context/auth/authContext";
import { useRealtime } from "../../context/realtime/realtimeContext";
import { useUser } from "../../context/user/userContext";

const TTL_MS = 30_000;

const OnlineUsersMarkers = () => {
  const { user } = useAuth();
  const { locationsByUserId } = useRealtime();
  const { handleGetAll } = useUser();
  const [nameById, setNameById] = useState(() => ({}));

  useEffect(() => {
    let mounted = true;

    const loadNames = async () => {
      try {
        const params = { limit: 0, ["filter[role]"]: "member", ["op[role]"]: "=" };
        const res = await handleGetAll(params);
        if (!res?.ok || !mounted) return;

        const map = {};
        for (const u of res.data ?? []) {
          const id = String(u?.id || u?.user_id || u?.userId || u?.uuid || "");
          if (!id) continue;
          map[id] = u?.username || u?.name || id;
        }
        setNameById(map);
      } catch {
        // ignore
      }
    };

    loadNames();
    return () => {
      mounted = false;
    };
  }, [handleGetAll]);

  const selfId = String(user?.id || "");
  const now = Date.now();

  const entries = Object.entries(locationsByUserId || {})
    .filter(([uid, loc]) => {
      if (!uid || uid === selfId) return false;
      const updatedAt = loc?.updatedAt ?? 0;
      return now - updatedAt <= TTL_MS;
    })
    .map(([uid, loc]) => ({ uid, loc }));

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(({ uid, loc }) => (
        <CircleMarker
          key={uid}
          center={[loc.latitude, loc.longitude]}
          radius={5}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#1e3a5f", fillOpacity: 0.65 }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
            {nameById[uid] || uid}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
};

export default OnlineUsersMarkers;
