import { useEffect, useMemo, useState } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { useAuth } from "../../context/auth/authContext";
import { useRealtime } from "../../context/realtime/realtimeContext";
import { useUser } from "../../context/user/userContext";

// Admin view should be more tolerant of stale data than user view.
const TTL_MS = 10 * 60 * 1000;

const AdminUsersMarkers = ({ selectedUserId, onSelectUser }) => {
  const { user } = useAuth();
  const { locationsByUserId, onlineMap, onlineUserIds } = useRealtime();
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

  const entries = useMemo(() => {
    return Object.entries(locationsByUserId || {})
      .filter(([uid, loc]) => {
        if (!uid) return false;
        if (selfId && uid === selfId) return false;

        // Admin map should only show users that are online right now.
        const isOnline = onlineMap?.[uid] === true || onlineUserIds?.has?.(String(uid));
        if (!isOnline) return false;

        const updatedAt = Number(loc?.updatedAt ?? 0);
        return now - updatedAt <= TTL_MS;
      })
      .map(([uid, loc]) => ({ uid, loc }));
  }, [locationsByUserId, now, selfId, onlineMap, onlineUserIds]);

  if (entries.length === 0) return null;

  const getMarkerStyle = (uid) => {
    const hasOnline = onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, uid);
    const isOnline = hasOnline ? !!onlineMap[uid] : onlineUserIds?.has?.(String(uid)) ? true : null;

    // Online: green, Offline: gray, Unknown: blue
    const fillColor = isOnline === true ? "#22c55e" : isOnline === false ? "#94a3b8" : "#1e3a5f";
    const isSelected = selectedUserId && String(selectedUserId) === String(uid);

    return {
      radius: isSelected ? 9 : 6,
      pathOptions: {
        color: "#fff",
        weight: isSelected ? 3 : 2,
        fillColor,
        fillOpacity: 0.85,
      },
    };
  };

  return (
    <>
      {entries.map(({ uid, loc }) => {
        const style = getMarkerStyle(uid);
        const label = nameById[uid] || uid;
        return (
          <CircleMarker
            key={uid}
            center={[loc.latitude, loc.longitude]}
            radius={style.radius}
            pathOptions={style.pathOptions}
            eventHandlers={{
              click: () => {
                onSelectUser && onSelectUser({ userId: uid, name: label });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              {label}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
};

export default AdminUsersMarkers;
