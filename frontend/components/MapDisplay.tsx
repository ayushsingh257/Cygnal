"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix marker icon issue with Leaflet + Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface MapDisplayProps {
  latitude: number;
  longitude: number;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ latitude, longitude }) => {
  const position: [number, number] = [latitude, longitude];

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border mt-4">
      <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            GPS Location<br />
            Lat: {latitude}, Lng: {longitude}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapDisplay;
