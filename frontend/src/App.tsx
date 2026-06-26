import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import StudentDashboard from "./pages/student/StudentDashboard";
import CounselorDashboard from "./pages/counselor/CounselorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

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

// Foundational dashboard Shell layout showing premium visual styles
const DashboardLayout: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      {/* Glow effects backdrop */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Sleek Left Sidebar */}
      <aside className="w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800 p-6 flex flex-col justify-between hidden md:flex z-10">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-slate-800 overflow-hidden shadow-md shadow-violet-500/10 bg-slate-950 flex items-center justify-center">
              <img src="/favicon.jpg" alt="MindGuard Logo" className="h-full w-full object-cover" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              MindGuard
            </span>
          </div>
          <nav className="space-y-1.5">
            <a 
              href="#" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600/15 to-indigo-500/5 text-violet-400 font-semibold text-sm border border-violet-500/10"
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </a>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-5 flex flex-col gap-3">
          <div className="px-3 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">Logged in as</p>
              <p className="text-xs font-bold text-slate-200 truncate">{user?.email}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-violet-600/10 border border-violet-500/20 text-[10px] text-violet-400 font-bold tracking-widest uppercase">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <header className="h-16 border-b border-slate-800/60 px-6 md:px-8 flex items-center justify-between bg-slate-900/20 backdrop-blur-md shrink-0">
          <div>
            <h2 className="font-bold text-lg text-white leading-tight">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{subtitle}</p>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Guarded route pathways with allowed roles check */}
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
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <DashboardLayout
                  title="Institutional Analytics Dashboard"
                  subtitle="Anonymized macro-level campus stress indices and demographic distributions."
                >
                  <AdminDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

