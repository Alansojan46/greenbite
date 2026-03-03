import React from "react";
import { ClaimFlowPage } from "./ClaimFlowPage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { NotificationsPanel } from "../components/NotificationsPanel.jsx";

export const NGODashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">NGO Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tell us what you need and we’ll suggest the best nearby donations to claim.
        </p>
        {user?.organizationName && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Organization:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {user.organizationName}
            </span>
          </p>
        )}
      </div>
      <NotificationsPanel title="Updates" limit={5} />
      <ClaimFlowPage />
    </div>
  );
};
