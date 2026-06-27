import React from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  X,
  Settings,
} from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

type SidebarItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

const roleNavigation: Record<UserRole, SidebarItem[]> = {
  STUDENT: [
    { label: "Overview", to: "/student/dashboard", icon: LayoutDashboard },
    { label: "Check-In", to: "/student/check-in", icon: ClipboardCheck },
    { label: "Mood History", to: "/student/history", icon: Activity },
    { label: "Resources", to: "/student/resources", icon: BookOpen },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
  COUNSELOR: [
    { label: "Overview", to: "/counselor/dashboard", icon: LayoutDashboard },
    { label: "Active Alerts", to: "/counselor/alerts", icon: AlertCircle },
    { label: "Student Records", to: "/counselor/students", icon: Users },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
  ADMIN: [
    { label: "Overview", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Wellness Reports", to: "/admin/reports", icon: BarChart3 },
    { label: "User Directory", to: "/admin/directory", icon: Users },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
};

interface SidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, onCloseMobile }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex flex-col justify-between border-r border-border/50 bg-card/60 backdrop-blur-md p-6 h-full",
        className
      )}
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-border/50 bg-background/50 shadow-sm overflow-hidden flex items-center justify-center">
              <img src="/favicon.jpg" alt="MindGuard Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              MindGuard
            </span>
          </div>
          
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors md:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          {roleNavigation[user.role].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-300",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary shadow-sm shadow-primary/5"
                      : "border-transparent text-muted-foreground hover:border-border/50"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-border/50 pt-5">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Logged in as</p>
            <p className="truncate text-xs font-bold text-foreground">{user.email}</p>
            <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-bold tracking-wider text-primary uppercase">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:border-border/50 hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
