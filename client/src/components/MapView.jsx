import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader, HeatmapLayer } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 28.6139, lng: 77.209 };

const clampZoom = (z) => Math.max(3, Math.min(20, Number(z) || 12));

const buildOsmEmbedSrc = ({ center, zoom }) => {
  const lat = Number(center?.lat ?? defaultCenter.lat);
  const lng = Number(center?.lng ?? defaultCenter.lng);

  // Rough "zoom" mapping for bbox span in degrees.
  const span = Math.max(0.002, Math.min(1.5, 0.5 / Math.pow(2, Math.max(0, zoom - 5))));
  const left = lng - span;
  const right = lng + span;
  const bottom = lat - span;
  const top = lat + span;
  const bbox = `${left},${bottom},${right},${top}`;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

const pickFirstPoint = ({ donorLocation, ngoLocation, markers, heatmapPoints }) =>
  donorLocation ||
  ngoLocation ||
  (markers && markers[0]?.position) ||
  (heatmapPoints && heatmapPoints[0]) ||
  defaultCenter;

const useGeoFollow = ({ onLocation }) => {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const watchIdRef = useRef(null);

  const stopFollowing = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsFollowing(false);
  }, []);

  const locateOnce = useCallback(() => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocation?.(loc);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(err?.message || "Failed to get your location.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, [onLocation]);

  const startFollowing = useCallback(() => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    if (watchIdRef.current != null) {
      setIsFollowing(true);
      return;
    }

    setLocating(true);
    setIsFollowing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocation?.(loc);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(err?.message || "Failed to follow your location.");
        stopFollowing();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, [onLocation, stopFollowing]);

  const toggleFollow = useCallback(() => {
    if (isFollowing) stopFollowing();
    else startFollowing();
  }, [isFollowing, startFollowing, stopFollowing]);

  useEffect(() => () => stopFollowing(), [stopFollowing]);

  return {
    locating,
    locationError,
    isFollowing,
    locateOnce,
    toggleFollow,
  };
};

const MapControls = ({
  isFullSize,
  setIsFullSize,
  locating,
  isFollowing,
  onLocate,
  onToggleFollow,
  onOpenGoogleMaps,
  onOpenDirections,
  locationError,
}) => (
  <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-2">
    <button
      type="button"
      onClick={() => setIsFullSize((v) => !v)}
      className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
    >
      {isFullSize ? "Exit full size" : "Full size"}
    </button>
    <button
      type="button"
      onClick={onLocate}
      disabled={locating}
      className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
    >
      {locating ? "Locating..." : "Locate me"}
    </button>
    <button
      type="button"
      onClick={onToggleFollow}
      className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
    >
      {isFollowing ? "Stop following" : "Follow me"}
    </button>
    <button
      type="button"
      onClick={onOpenGoogleMaps}
      className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
    >
      Open in Google Maps
    </button>
    <button
      type="button"
      onClick={onOpenDirections}
      className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
    >
      Directions
    </button>
    {locationError && (
      <div className="max-w-[220px] rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm backdrop-blur dark:border-amber-900/40 dark:bg-amber-950/50 dark:text-amber-100">
        {locationError}
      </div>
    )}
  </div>
);

const MapViewOsm = ({
  donorLocation,
  ngoLocation,
  heatmapPoints,
  markers = [],
  center: centerProp,
  zoom = 12,
  height = "400px",
}) => {
  const [isFullSize, setIsFullSize] = useState(false);
  const [centerOverride, setCenterOverride] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const firstPoint = pickFirstPoint({ donorLocation, ngoLocation, markers, heatmapPoints });
  const center = centerOverride || centerProp || firstPoint || defaultCenter;
  const effectiveHeight = isFullSize ? "100vh" : height;

  const osmEmbedSrc = useMemo(() => buildOsmEmbedSrc({ center, zoom }), [center, zoom]);

  const geo = useGeoFollow({
    onLocation: (loc) => {
      setUserLocation(loc);
      setCenterOverride(loc);
    },
  });

  const openGoogleMaps = useCallback(() => {
    const lat = Number(center?.lat ?? defaultCenter.lat);
    const lng = Number(center?.lng ?? defaultCenter.lng);
    const z = clampZoom(zoom);
    window.open(`https://www.google.com/maps/@${lat},${lng},${z}z`, "_blank", "noopener,noreferrer");
  }, [center, zoom]);

  const openDirections = useCallback(() => {
    const dest =
      (markers && markers[0]?.position) ||
      donorLocation ||
      ngoLocation ||
      center ||
      defaultCenter;
    const destLat = Number(dest?.lat ?? defaultCenter.lat);
    const destLng = Number(dest?.lng ?? defaultCenter.lng);

    const params = new URLSearchParams({
      api: "1",
      destination: `${destLat},${destLng}`,
    });
    if (userLocation?.lat != null && userLocation?.lng != null) {
      params.set("origin", `${Number(userLocation.lat)},${Number(userLocation.lng)}`);
    }
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [markers, donorLocation, ngoLocation, center, userLocation]);

  return (
    <div
      className={
        isFullSize ? "fixed inset-0 z-[9999] bg-slate-950/40 p-3 backdrop-blur" : "space-y-3"
      }
    >
      {!isFullSize && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          Map is running in no-key mode (OpenStreetMap).
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:shadow-slate-900/50">
        <MapControls
          isFullSize={isFullSize}
          setIsFullSize={setIsFullSize}
          locating={geo.locating}
          isFollowing={geo.isFollowing}
          onLocate={geo.locateOnce}
          onToggleFollow={geo.toggleFollow}
          onOpenGoogleMaps={openGoogleMaps}
          onOpenDirections={openDirections}
          locationError={geo.locationError}
        />
        <iframe
          title="OpenStreetMap"
          src={osmEmbedSrc}
          style={{ width: "100%", height: effectiveHeight }}
          className="block"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

const MapViewGoogle = ({
  apiKey,
  donorLocation,
  ngoLocation,
  heatmapPoints,
  markers = [],
  pickable = false,
  pickedLocation = null,
  onPickLocation,
  pickedLabel = "Selected",
  center: centerProp,
  zoom = 12,
  height = "400px",
}) => {
  const [isFullSize, setIsFullSize] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [centerOverride, setCenterOverride] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loaderTimedOut, setLoaderTimedOut] = useState(false);

  // Must be stable across renders; changing libraries triggers:
  // "Loader must not be called again with different options."
  const libraries = useMemo(() => ["visualization"], []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });

  const onLoad = useCallback((map) => setMapInstance(map), []);

  const firstPoint = pickFirstPoint({ donorLocation, ngoLocation, markers, heatmapPoints });
  const center = centerOverride || centerProp || firstPoint || defaultCenter;
  const effectiveHeight = isFullSize ? "100vh" : height;

  const geo = useGeoFollow({
    onLocation: (loc) => {
      setUserLocation(loc);
      setCenterOverride(loc);
      if (mapInstance && typeof mapInstance.panTo === "function") mapInstance.panTo(loc);
      if (mapInstance && typeof mapInstance.setZoom === "function") mapInstance.setZoom(Math.max(zoom, 14));
    },
  });

  useEffect(() => {
    setLoaderTimedOut(false);
    if (isLoaded || loadError) return;
    const t = setTimeout(() => setLoaderTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [isLoaded, loadError]);

  const openGoogleMaps = useCallback(() => {
    const lat = Number(center?.lat ?? defaultCenter.lat);
    const lng = Number(center?.lng ?? defaultCenter.lng);
    const z = clampZoom(zoom);
    window.open(`https://www.google.com/maps/@${lat},${lng},${z}z`, "_blank", "noopener,noreferrer");
  }, [center, zoom]);

  const openDirections = useCallback(() => {
    const dest =
      (markers && markers[0]?.position) ||
      donorLocation ||
      ngoLocation ||
      center ||
      defaultCenter;
    const destLat = Number(dest?.lat ?? defaultCenter.lat);
    const destLng = Number(dest?.lng ?? defaultCenter.lng);
    const params = new URLSearchParams({
      api: "1",
      destination: `${destLat},${destLng}`,
    });
    if (userLocation?.lat != null && userLocation?.lng != null) {
      params.set("origin", `${Number(userLocation.lat)},${Number(userLocation.lng)}`);
    }
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [markers, donorLocation, ngoLocation, center, userLocation]);

  if (!isLoaded) {
    if (loadError || loaderTimedOut) {
      // Still allow the user to view a map via OSM if Google fails.
      return (
        <MapViewOsm
          donorLocation={donorLocation}
          ngoLocation={ngoLocation}
          heatmapPoints={heatmapPoints}
          markers={markers}
          center={centerProp}
          zoom={zoom}
          height={height}
        />
      );
    }
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        Loading map...
      </div>
    );
  }

  return (
    <div className={isFullSize ? "fixed inset-0 z-[9999] bg-slate-950/40 p-3 backdrop-blur" : ""}>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:shadow-slate-900/50">
        <MapControls
          isFullSize={isFullSize}
          setIsFullSize={setIsFullSize}
          locating={geo.locating}
          isFollowing={geo.isFollowing}
          onLocate={geo.locateOnce}
          onToggleFollow={geo.toggleFollow}
          onOpenGoogleMaps={openGoogleMaps}
          onOpenDirections={openDirections}
          locationError={geo.locationError}
        />
        <GoogleMap
          mapContainerStyle={{ ...containerStyle, height: effectiveHeight }}
          center={center}
          zoom={zoom}
          onLoad={onLoad}
          onClick={(e) => {
            if (!pickable) return;
            const lat = e?.latLng?.lat?.();
            const lng = e?.latLng?.lng?.();
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            const loc = { lat, lng };
            setCenterOverride(loc);
            if (mapInstance && typeof mapInstance.panTo === "function") mapInstance.panTo(loc);
            onPickLocation?.(loc);
          }}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          {userLocation && (
            <Marker position={userLocation} label={{ text: "You", color: "#0f172a", fontSize: "11px" }} />
          )}
          {pickedLocation && (
            <Marker
              position={pickedLocation}
              label={{ text: pickedLabel, color: "#0f172a", fontSize: "11px" }}
            />
          )}
          {donorLocation && (
            <Marker position={donorLocation} label={{ text: "Donor", color: "#16a34a", fontSize: "11px" }} />
          )}
          {ngoLocation && (
            <Marker position={ngoLocation} label={{ text: "NGO", color: "#38bdf8", fontSize: "11px" }} />
          )}
          {markers.map((m, i) => (
            <Marker
              key={i}
              position={m.position}
              label={m.label ? { text: m.label, color: "#0f172a", fontSize: "10px" } : undefined}
            />
          ))}
          {heatmapPoints && heatmapPoints.length > 0 && (
            <HeatmapLayer
              data={heatmapPoints.map((p) => ({
                location: new window.google.maps.LatLng(p.lat, p.lng),
                weight: typeof p.weight === "number" ? p.weight : 1,
              }))}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export const MapView = (props) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
  const enableGoogle =
    String(import.meta.env.VITE_ENABLE_GOOGLE_MAPS || "").toLowerCase() === "true" && !!apiKey;

  // Professional default: don't load Google Maps unless explicitly enabled.
  // This prevents console errors like "NoApiKeys" and "ApiProjectMapError" on fresh installs/demos.
  if (!enableGoogle) return <MapViewOsm {...props} />;
  return <MapViewGoogle apiKey={apiKey} {...props} />;
};
