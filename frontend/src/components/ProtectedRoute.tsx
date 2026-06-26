import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show a full-screen loading state during silent cookie-session check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-400">MindGuard is loading secure session...</p>
      </div>
    );
  }

  // Redirect to login if user is unauthenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If user does not have permission, redirect them to their role-appropriate home dashboard
  if (!allowedRoles.includes(user.role)) {
    if (user.role === "STUDENT") {
      return <Navigate to="/student/dashboard" replace />;
    } else if (user.role === "COUNSELOR") {
      return <Navigate to="/counselor/dashboard" replace />;
    } else if (user.role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
