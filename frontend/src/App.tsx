import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

import StudentDashboard from "./pages/student/StudentDashboard";
import CounselorDashboard from "./pages/counselor/CounselorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Settings from "./pages/settings/Settings";

// Setup global React Query client with standard stale time (5 minutes)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Public auth pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* STUDENT Guarded Pathways */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <DashboardLayout
                    title="Student Wellness Hub"
                    subtitle="Your secure, private space to track mental wellness indices and journal check-ins."
                  >
                    <StudentDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/check-in"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <DashboardLayout
                    title="Daily Mood Check-In"
                    subtitle="Log your emotional check-in via text, voice, or standard clinical survey."
                  >
                    <StudentDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/history"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <DashboardLayout
                    title="Mood Logs & Trajectory"
                    subtitle="Review your historical mood entries, wellness scores, and risk analysis."
                  >
                    <StudentDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/resources"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <DashboardLayout
                    title="Self-Care Recommendations"
                    subtitle="Access clinical exercises, meditation techniques, and customized pathways."
                  >
                    <StudentDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* COUNSELOR Guarded Pathways */}
            <Route
              path="/counselor/dashboard"
              element={
                <ProtectedRoute allowedRoles={["COUNSELOR"]}>
                  <DashboardLayout
                    title="Counselor Triage Console"
                    subtitle="Monitor warnings queue, manage clinical assignments, and update case files."
                  >
                    <CounselorDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/alerts"
              element={
                <ProtectedRoute allowedRoles={["COUNSELOR"]}>
                  <DashboardLayout
                    title="Active Intervention Alerts"
                    subtitle="Triage high-risk clinical warnings flagged by student check-ins."
                  >
                    <CounselorDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/students"
              element={
                <ProtectedRoute allowedRoles={["COUNSELOR"]}>
                  <DashboardLayout
                    title="Student Case Files"
                    subtitle="Access historical wellness charts, extracted NLP emotions, and user dossiers."
                  >
                    <CounselorDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* ADMIN Guarded Pathways */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <DashboardLayout
                    title="Institutional Analytics Dashboard"
                    subtitle="Anonymized macro-level campus stress indices and risk breakdowns."
                  >
                    <AdminDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <DashboardLayout
                    title="Institutional Wellness Reports"
                    subtitle="Explore aggregated wellness index Average monthly trendlines."
                  >
                    <AdminDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/directory"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <DashboardLayout
                    title="User Directory"
                    subtitle="Audit and manage all registered student, counselor, and admin accounts."
                  >
                    <AdminDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* COMMON Settings Pathway */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["STUDENT", "COUNSELOR", "ADMIN"]}>
                  <DashboardLayout
                    title="Account Settings"
                    subtitle="Manage appearance themes, security configurations, and notification preferences."
                  >
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
