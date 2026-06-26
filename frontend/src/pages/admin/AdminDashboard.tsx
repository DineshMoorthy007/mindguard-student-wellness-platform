import React, { useState } from "react";
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
  Users, Activity, AlertTriangle, Sparkles, Loader2 
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
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

  return (
    <div className="space-y-6 min-h-[calc(100vh-80px)] text-slate-200">
      {/* Top Banner / Filter Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-white text-md font-bold">Institution-Wide Analytics</h3>
          <p className="text-slate-400 text-xs mt-0.5">Macro-level dashboard showing aggregated student wellness levels across the campus.</p>
        </div>

        {/* Date Filters Form */}
        <div className="flex flex-wrap items-end gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs text-slate-400 hover:text-slate-200 border-slate-800 bg-slate-900"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {isReportLoading ? (
        // Loading State Skeleton
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-slate-800/60 bg-slate-900/30 animate-pulse h-24">
                <CardContent className="h-full flex items-center justify-between p-6">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-800 rounded" />
                    <div className="h-6 w-12 bg-slate-800 rounded" />
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-slate-800" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 border-slate-800 bg-slate-900/30 h-80 animate-pulse" />
            <Card className="lg:col-span-2 border-slate-800 bg-slate-900/30 h-80 animate-pulse" />
          </div>
        </div>
      ) : isReportError || !report ? (
        // Error / Empty State
        <div className="flex flex-col items-center justify-center text-center p-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
          <AlertTriangle className="h-10 w-10 text-violet-500/60 mb-3 animate-bounce" />
          <h4 className="text-slate-300 font-bold text-sm">Failed to Load Campus Report</h4>
          <p className="text-slate-500 text-xs max-w-xs mt-1">We couldn't retrieve the aggregated demographics database. Please check your credentials or retry later.</p>
        </div>
      ) : (
        // Data Present View
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-800/60 bg-slate-900/20 backdrop-blur-md hover:bg-slate-900/40 transition-colors">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Students Monitored</p>
                  <h4 className="text-2xl font-black text-white mt-1 tracking-tight">{report.total_students_monitored.toLocaleString()}</h4>
                </div>
                <div className="h-10 w-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-400 border border-violet-500/10 shadow-lg shadow-violet-500/5">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/60 bg-slate-900/20 backdrop-blur-md hover:bg-slate-900/40 transition-colors">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wellness Index Average</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="text-2xl font-black text-white tracking-tight">{report.average_wellness_score}%</h4>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">Stable</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10 shadow-lg shadow-emerald-500/5">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/60 bg-slate-900/20 backdrop-blur-md hover:bg-slate-900/40 transition-colors">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dominant Emotion</p>
                  <h4 className="text-2xl font-black text-white mt-1 tracking-tight capitalize">{report.dominant_campus_emotion}</h4>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/60 bg-slate-900/20 backdrop-blur-md hover:bg-slate-900/40 transition-colors">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Alerts Queue</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="text-2xl font-black text-white tracking-tight">
                      {isAlertsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-500 inline" />
                      ) : (
                        pendingAlertCount
                      )}
                    </h4>
                    {pendingAlertCount > 0 && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/15">Action Required</span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-400 border border-red-500/10 shadow-lg shadow-red-500/5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
            {/* Monthly Trend Bar Chart */}
            <Card className="lg:col-span-3 border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white text-md">Campus Wellness Trend</CardTitle>
                <CardDescription className="text-slate-400">Monthly aggregate average of calculated student wellness scores.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                    <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                      labelStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
                      itemStyle={{ fontSize: "12px", color: "#f8fafc" }}
                    />
                    <Bar
                      dataKey="score"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Distribution Pie Chart */}
            <Card className="lg:col-span-2 border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white text-md">Clinical Risk Breakdown</CardTitle>
                <CardDescription className="text-slate-400">Distribution of students based on assessed security risk levels.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-between">
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                        itemStyle={{ fontSize: "12px", color: "#f8fafc" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend List */}
                <div className="flex justify-around border-t border-slate-800/80 pt-4 pb-2">
                  {riskData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.name}</p>
                        <p className="text-xs font-black text-white">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
