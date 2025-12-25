import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import GeoMarker from "./GeoMarker";
import OnlineUsersMarkers from "./OnlineUsersMarkers";

const LeafletMap = forwardRef(({ tileUrl, onMapReady }, ref) => {
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    recenterToCurrentLocation: () => {
      if (!mapRef.current || !navigator?.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const latlng = [latitude, longitude];

          const zoom = mapRef.current.getZoom?.() ?? 16;

          mapRef.current.setView(latlng, Math.max(zoom, 16));
        },
        (err) => console.log("Geo error:", err),
        {
          enableHighAccuracy: false,
          maximumAge: 5000,
          timeout: 8000,
        }
      );
    },
  }));

  return (
    <MapContainer
      whenCreated={(m) => (mapRef.current = m)}
      whenReady={(e) => {
        mapRef.current = e.target;
        onMapReady && onMapReady(e.target);
      }}
      center={[-2.5, 118.0]}
      zoom={20}
      style={{ height: "100vh", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer url={tileUrl} />
      <GeoMarker />
      <OnlineUsersMarkers />
    </MapContainer>
  );
});

export default LeafletMap;
