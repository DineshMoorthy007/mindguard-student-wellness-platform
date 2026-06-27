import React, { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useInstitutionReport } from "@/hooks/useAnalytics";
import { useCounselorAlerts } from "@/hooks/useAlerts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell 
} from "recharts";
import { 
  Users, Activity, AlertTriangle, Sparkles, Loader2, Plus, Search, UserCheck, Shield 
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { theme } = useTheme();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [userPage, setUserPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("");

  const { data: directoryData, isLoading: isDirectoryLoading } = useQuery({
    queryKey: ["admin-user-directory", userPage, roleFilter],
    queryFn: async () => {
      const url = roleFilter 
        ? `/admin/users?page=${userPage}&role=${roleFilter}` 
        : `/admin/users?page=${userPage}`;
      const response = await api.get(url);
      return response.data;
    },
    enabled: path === "/admin/directory"
  });
  
  // React Query Fetching
  const { data: report, isLoading: isReportLoading, isError: isReportError } = useInstitutionReport(
    startDate || undefined,
    endDate || undefined
  );
  
  const { data: alertsData, isLoading: isAlertsLoading } = useCounselorAlerts("PENDING");

  // Fallback monthly data for bar chart
  const monthlyTrends = [
    { name: "Jan", score: 65.4 },
    { name: "Feb", score: 66.8 },
    { name: "Mar", score: 64.5 },
    { name: "Apr", score: 67.2 },
    { name: "May", score: 68.0 },
    { name: "Jun", score: report?.average_wellness_score || 68.4 }
  ];

  // Pie chart risk distribution formatting
  const riskData = report ? [
    { name: "Low Risk", value: report.risk_distribution.LOW, color: "#10b981" },     // Emerald
    { name: "Medium Risk", value: report.risk_distribution.MEDIUM, color: "#f59e0b" }, // Amber
    { name: "High Risk", value: report.risk_distribution.HIGH, color: "#ef4444" }      // Red
  ] : [];

  const pendingAlertCount = alertsData?.total ?? alertsData?.alerts.length ?? 0;

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const isReportsPage = path === "/admin/reports";
  const isDirectoryPage = path === "/admin/directory";
  const isOverviewPage = path === "/admin/dashboard" || (!isReportsPage && !isDirectoryPage);

  return (
    <div className="space-y-6 min-h-[calc(100vh-80px)] text-foreground">
      {/* 1. OVERVIEW VIEW */}
      {isOverviewPage && (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-border/50 pb-4">
            <h3 className="text-foreground text-base md:text-lg font-extrabold">Institutional Overview</h3>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Macro-level dashboard showing aggregated student wellness indices.</p>
          </div>

          {/* Quick Info Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between rounded-xl">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Wellness Index</p>
                <h4 className="text-3xl font-extrabold text-primary mt-1">
                  {isReportLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    report?.average_wellness_score.toFixed(1) ?? "0.0"
                  )}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Calculated macro score campus-wide</p>
            </Card>

            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between rounded-xl">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Alerts Queue</p>
                <h4 className="text-3xl font-extrabold text-red-500 mt-1">
                  {isAlertsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                  ) : (
                    pendingAlertCount
                  )}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">High risk cases awaiting counselor claim</p>
            </Card>

            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between rounded-xl">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Monitored Base</p>
                <h4 className="text-3xl font-extrabold text-foreground mt-1">
                  {isReportLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    report?.total_students_monitored ?? 0
                  )}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Active registered student accounts</p>
            </Card>
          </div>

          {/* Risk distribution Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-border/50 bg-card/40 backdrop-blur-md p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-sm md:text-base text-foreground mb-3">Triage Instructions</h4>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                  MindGuard monitors Campus Stress Indices using NLP evaluations of daily journal check-ins. 
                  High risk indicators route warning flags to counselor triage consoles automatically.
                </p>
              </div>
              <div className="border-t border-border/50 pt-4 mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">System Status</span>
                  <span className="text-emerald-500 font-bold">Online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ML Evaluator</span>
                  <span className="text-primary font-bold">DistilBERT Active</span>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2 border-border/50 bg-card/40 backdrop-blur-md overflow-hidden rounded-xl">
              <CardHeader>
                <CardTitle className="text-foreground text-sm md:text-base font-extrabold">Clinical Risk Breakdown</CardTitle>
                <CardDescription className="text-muted-foreground text-xs md:text-sm">Distribution of students based on assessed security risk levels.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] flex flex-col justify-between">
                <div className="flex-1 min-h-[180px]">
                  {isReportLoading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                            border: "1px solid var(--border)", 
                            borderRadius: "12px" 
                          }}
                          itemStyle={{ fontSize: "12px", color: "var(--foreground)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Legend List */}
                <div className="flex justify-around border-t border-border/40 pt-3 pb-1">
                  {riskData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{item.name}</p>
                        <p className="text-xs md:text-sm font-black text-foreground">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. REPORTS VIEW */}
      {isReportsPage && (
        <div className="space-y-6">
          {/* Top Banner / Filter Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-foreground text-base md:text-lg font-extrabold">Campus stress indices</h3>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Macro-level dashboard showing wellness trends filtered by dates.</p>
            </div>

            {/* Date Filters Form */}
            <div className="flex flex-wrap items-end gap-3 bg-background/40 p-3 rounded-xl border border-border/70">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs md:text-sm bg-background border-border/70 text-foreground w-36"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs md:text-sm bg-background border-border/70 text-foreground w-36"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs md:text-sm text-muted-foreground hover:text-foreground border-border/70 bg-background"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Bar Chart wellness scores monthly trends */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden rounded-xl">
            <CardHeader>
              <CardTitle className="text-foreground text-sm md:text-base font-extrabold">Aggregated Monthly Trendlines</CardTitle>
              <CardDescription className="text-muted-foreground text-xs md:text-sm">University aggregate index of mental wellness average score trajectory.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {isReportLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={10} />
                    <YAxis stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                        border: "1px solid var(--border)", 
                        borderRadius: "12px" 
                      }} 
                      labelStyle={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: "bold" }}
                      itemStyle={{ fontSize: "12px", color: "var(--foreground)" }}
                    />
                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. USER DIRECTORY VIEW */}
      {isDirectoryPage && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-foreground text-base md:text-lg font-extrabold">User Directory</h3>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Manage and audit registered user accounts across the institution.</p>
            </div>

            {/* Role filter buttons */}
            <div className="flex bg-background/50 border border-border/70 p-0.5 rounded-lg">
              {([
                { label: "All Roles", value: "" },
                { label: "Students", value: "STUDENT" },
                { label: "Counselors", value: "COUNSELOR" },
                { label: "Admins", value: "ADMIN" }
              ] as const).map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setRoleFilter(filter.value);
                    setUserPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 ${
                    roleFilter === filter.value
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Table card */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              {isDirectoryLoading ? (
                <div className="space-y-3 p-6">
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                </div>
              ) : !directoryData || directoryData.users.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <h4 className="text-foreground font-semibold text-xs">No registered accounts found</h4>
                </div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground font-bold bg-background/30">
                          <th className="p-4 uppercase tracking-wider">User Reference</th>
                          <th className="p-4 uppercase tracking-wider">Email Address</th>
                          <th className="p-4 uppercase tracking-wider">Access Role</th>
                          <th className="p-4 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {directoryData.users.map((user: any) => (
                          <tr key={user.id} className="hover:bg-accent/10 transition-colors">
                            <td className="p-4 font-mono text-muted-foreground text-xs">
                              {user.id.substring(0, 18)}...
                            </td>
                            <td className="p-4 font-bold text-foreground">{user.email}</td>
                            <td className="p-4">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold tracking-wider uppercase ${
                                user.role === "STUDENT" 
                                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                  : user.role === "COUNSELOR"
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-primary/10 text-primary border border-primary/20"
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 font-bold ${
                                user.is_active ? "text-emerald-500" : "text-muted-foreground"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  user.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                                }`} />
                                {user.is_active ? "Active" : "Disabled"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {directoryData.total_pages > 1 && (
                    <div className="flex justify-between items-center border-t border-border/40 p-4 bg-background/20 text-xs">
                      <Button
                        disabled={userPage === 1}
                        onClick={() => setUserPage(userPage - 1)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        Previous
                      </Button>
                      <span className="text-muted-foreground font-semibold">
                        Page {directoryData.page} of {directoryData.total_pages}
                      </span>
                      <Button
                        disabled={userPage >= directoryData.total_pages}
                        onClick={() => setUserPage(userPage + 1)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
