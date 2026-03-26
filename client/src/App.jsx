import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DonorDashboard } from "./pages/DonorDashboard.jsx";
import { NGODashboard } from "./pages/NGODashboard.jsx";
import { RegularDashboard } from "./pages/RegularDashboard.jsx";
import { DonationFeed } from "./pages/DonationFeed.jsx";
import { ClaimFlowPage } from "./pages/ClaimFlowPage.jsx";
import { AddDonationPage } from "./pages/AddDonationPage.jsx";
import { AIInsightsPage } from "./pages/AIInsightsPage.jsx";
import { HeatmapPage } from "./pages/HeatmapPage.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard.jsx";
import { PathNormalizer } from "./components/PathNormalizer.jsx";

const App = () => {
  return (
    <Layout>
      <PathNormalizer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard/donor"
          element={
            <ProtectedRoute allowedRoles={["donor"]}>
              <DonorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/ngo"
          element={
            <ProtectedRoute allowedRoles={["ngo"]}>
              <NGODashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RegularDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/claim-flow"
          element={
            <ProtectedRoute>
              <ClaimFlowPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donate"
          element={
            <ProtectedRoute>
              <AddDonationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <DonationFeed />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-insights"
          element={
            <ProtectedRoute>
              <AIInsightsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/heatmap"
          element={
            <ProtectedRoute>
              <HeatmapPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
};

export default App;
