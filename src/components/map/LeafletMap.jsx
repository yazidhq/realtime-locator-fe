import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import GeoMarker from "./GeoMarker";

const LeafletMap = forwardRef(({ tileUrl, onMapReady }, ref) => {
  const defaultTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const currentTileUrl = tileUrl || defaultTileUrl;

  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    recenterToCurrentLocation: () => {
      if (!mapRef.current || !navigator?.geolocation) return;

      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!pos || !pos.coords) return;
            const latlng = [pos.coords.latitude, pos.coords.longitude];
            const preferredZoom = Math.max(mapRef.current.getZoom(), 16);
            try {
              mapRef.current.setView(latlng, preferredZoom);
            } catch (err) {
              console.log(err);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } catch (err) {
        console.log(err);
      }
    },
  }));

  return (
    <MapContainer
      whenCreated={(m) => {
        mapRef.current = m;
        if (typeof onMapReady === "function") {
          try {
            onMapReady(m);
          } catch (err) {
            console.debug("onMapReady callback failed", err);
          }
        }
      }}
      center={[-2.5, 118.0]}
      zoom={20}
      style={{ height: "100vh", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer key={currentTileUrl} url={currentTileUrl} />
      <GeoMarker />
    </MapContainer>
  );
});

export default LeafletMap;
