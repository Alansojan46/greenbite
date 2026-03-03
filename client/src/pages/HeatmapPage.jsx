import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { MapView } from "../components/MapView.jsx";

export const HeatmapPage = () => {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/ai/heatmap");
      setPoints(res.data.points || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Hunger Heatmap</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Visualize where donations and demand are concentrated to plan smarter
          outreach.
        </p>
      </div>

      <MapView heatmapPoints={points} />
    </div>
  );
};

