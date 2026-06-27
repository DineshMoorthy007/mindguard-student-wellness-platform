import React, { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useCounselorAlerts, useUpdateAlertStatus } from "@/hooks/useAlerts";
import { useMoodHistory } from "@/hooks/useMood";
import { useLatestAssessment } from "@/hooks/usePredictions";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  AlertCircle, CheckCircle2, Clock, X, ChevronRight, User as UserIcon, Loader2, Users 
} from "lucide-react";

export const CounselorDashboard: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const path = location.pathname;
  
  // Sidebar/Filter state
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // 1. Fetching Alerts Queue
  const { data: alertsData, isLoading: isAlertsLoading } = useCounselorAlerts(statusFilter);
  const { data: allAlertsData } = useCounselorAlerts("");
  const updateStatusMutation = useUpdateAlertStatus(statusFilter);

  // Parse unique student list
  const uniqueStudents = React.useMemo(() => {
    if (!allAlertsData?.alerts) return [];
    const studentMap = new Map<string, { studentId: string; lastAlert: string; alertCount: number }>();
    allAlertsData.alerts.forEach((alert) => {
      const existing = studentMap.get(alert.student_id);
      if (existing) {
        existing.alertCount += 1;
        if (new Date(alert.created_at) > new Date(existing.lastAlert)) {
          existing.lastAlert = alert.created_at;
        }
      } else {
        studentMap.set(alert.student_id, {
          studentId: alert.student_id,
          lastAlert: alert.created_at,
          alertCount: 1
        });
      }
    });
    return Array.from(studentMap.values());
  }, [allAlertsData]);

  // 2. Perform status transitions optimistically
  const handleStatusChange = async (alertId: string, newStatus: "PENDING" | "REVIEWED" | "RESOLVED") => {
    try {
      await updateStatusMutation.mutateAsync({ id: alertId, status: newStatus });
      toast({
        title: "Alert Status Updated",
        description: `Alert successfully marked as ${newStatus}.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Status Update Failed",
        description: "Failed to sync status changes to the database.",
        variant: "destructive",
      });
    }
  };

  const isAlertsPage = path === "/counselor/alerts";
  const isStudentsPage = path === "/counselor/students";
  const isOverviewPage = path === "/counselor/dashboard" || (!isAlertsPage && !isStudentsPage);

  // Filter student list by search query
  const filteredStudents = uniqueStudents.filter((s) =>
    s.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  return (
    <div className="relative space-y-6 min-h-[calc(100vh-80px)] text-foreground">
      {/* 1. OVERVIEW VIEW */}
      {isOverviewPage && (
        <div className="space-y-6">
          {/* Summary metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Alerts Queue</p>
                <h4 className="text-3xl font-extrabold text-red-500 mt-1">
                  {allAlertsData?.alerts.filter((a) => a.status === "PENDING").length ?? 0}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">High risk assessments awaiting evaluation</p>
            </Card>

            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Under Active Review</p>
                <h4 className="text-3xl font-extrabold text-amber-500 mt-1">
                  {allAlertsData?.alerts.filter((a) => a.status === "REVIEWED").length ?? 0}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Claimed case files being triaged</p>
            </Card>

            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resolved Cases</p>
                <h4 className="text-3xl font-extrabold text-emerald-500 mt-1">
                  {allAlertsData?.alerts.filter((a) => a.status === "RESOLVED").length ?? 0}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Interventions completed successfully</p>
            </Card>
          </div>

          {/* Quick links header */}
          <div className="flex justify-between items-center border-b border-border/50 pb-3">
            <div>
              <h3 className="text-foreground text-sm md:text-base font-extrabold">Recent Pending Warnings</h3>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">High-priority warning flags needing immediate review.</p>
            </div>
            <NavLink to="/counselor/alerts" className="text-xs md:text-sm font-bold text-primary hover:underline">
              View All Alerts →
            </NavLink>
          </div>

          {/* Teaser Alerts Queue */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              {isAlertsLoading ? (
                <div className="space-y-3 p-6">
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                </div>
              ) : !allAlertsData || allAlertsData.alerts.filter((a) => a.status === "PENDING").length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12">
                  <CheckCircle2 className="h-9 w-9 text-emerald-500/60 mb-2" />
                  <h4 className="text-foreground font-bold text-xs md:text-sm">No pending warnings. Excellent!</h4>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground font-bold bg-background/30">
                        <th className="p-4 uppercase tracking-wider">Date</th>
                        <th className="p-4 uppercase tracking-wider">Student ID</th>
                        <th className="p-4 uppercase tracking-wider">Risk Level</th>
                        <th className="p-4 uppercase tracking-wider text-right">Triage Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {allAlertsData.alerts
                        .filter((a) => a.status === "PENDING")
                        .slice(0, 5)
                        .map((alert) => (
                          <tr 
                            key={alert.id}
                            className="hover:bg-accent/20 cursor-pointer group transition-colors"
                            onClick={() => setSelectedStudentId(alert.student_id)}
                          >
                            <td className="p-4 text-muted-foreground">
                              {new Date(alert.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-4 font-bold text-foreground group-hover:text-primary transition-colors">
                              {alert.student_id.substring(0, 8)}...
                            </td>
                            <td className="p-4">
                              <span className="inline-block px-2 py-0.5 rounded font-bold text-xs tracking-wide bg-red-500/10 text-red-500 border border-red-500/20">
                                HIGH
                              </span>
                            </td>
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(alert.id, "REVIEWED")}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-8 px-3 rounded-lg"
                              >
                                Claim Case
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. ALERTS DIRECTORY VIEW */}
      {isAlertsPage && (
        <div className="space-y-6">
          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-foreground text-base md:text-lg font-extrabold">Active Intervention Alerts</h3>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Triage high-risk clinical warnings flagged by student check-ins</p>
            </div>

            {/* Filter buttons */}
            <div className="flex bg-background/50 border border-border/70 p-0.5 rounded-lg">
              {(["PENDING", "REVIEWED", "RESOLVED", ""] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 ${
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter === "" ? "All Alerts" : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Main Alerts Queue Table */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              {isAlertsLoading ? (
                <div className="space-y-3 p-6">
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                </div>
              ) : !alertsData || alertsData.alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-16">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mb-3 animate-bounce" />
                  <h4 className="text-foreground font-bold text-sm">All caught up! No active warnings.</h4>
                  <p className="text-muted-foreground text-xs max-w-xs mt-1">There are no alerts matching the selected status filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground font-bold bg-background/30">
                        <th className="p-4 uppercase tracking-wider">Created At</th>
                        <th className="p-4 uppercase tracking-wider">Student Reference</th>
                        <th className="p-4 uppercase tracking-wider">Risk Severity</th>
                        <th className="p-4 uppercase tracking-wider">Assessment ID</th>
                        <th className="p-4 uppercase tracking-wider">Workflow Status</th>
                        <th className="p-4 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {alertsData.alerts.map((alert) => (
                        <tr 
                          key={alert.id}
                          className="hover:bg-accent/20 cursor-pointer group transition-colors"
                          onClick={() => setSelectedStudentId(alert.student_id)}
                        >
                          <td className="p-4 text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="p-4 font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {alert.student_id.substring(0, 8)}...
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-xs tracking-wide bg-red-500/10 text-red-500 border border-red-500/20">
                              HIGH
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">{alert.assessment_id.substring(0, 12)}...</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              alert.status === "PENDING" 
                                ? "text-red-500" 
                                : alert.status === "REVIEWED" 
                                ? "text-amber-500" 
                                : "text-emerald-500"
                            }`}>
                              {alert.status === "PENDING" && <Clock className="h-3.5 w-3.5" />}
                              {alert.status === "REVIEWED" && <Clock className="h-3.5 w-3.5 animate-spin" />}
                              {alert.status === "RESOLVED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {alert.status}
                            </span>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              {alert.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(alert.id, "REVIEWED")}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-8 px-3 rounded-lg"
                                >
                                  Claim Alert
                                </Button>
                              )}
                              {alert.status !== "RESOLVED" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(alert.id, "RESOLVED")}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-3 rounded-lg"
                                >
                                  Close Alert
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedStudentId(alert.student_id)}
                                className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs flex items-center"
                              >
                                Profile <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. STUDENT DIRECTORY / RECORDS VIEW */}
      {isStudentsPage && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-foreground text-base md:text-lg font-extrabold">Student Wellness Directory</h3>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Explore active clinical case folders matching institutional alerts</p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search Student ID..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-lg border border-border/70 bg-background/50 px-3 text-xs md:text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Student Grid */}
          {isAlertsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 rounded-xl bg-muted/40 animate-pulse border border-border/70" />
              <div className="h-32 rounded-xl bg-muted/40 animate-pulse border border-border/70" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <h4 className="text-foreground font-semibold text-xs md:text-sm">No student case files found</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.studentId}
                  onClick={() => setSelectedStudentId(student.studentId)}
                  className="border-border/50 bg-card/40 hover:bg-accent/40 cursor-pointer transition-all p-5 rounded-xl hover:border-primary/20 hover:shadow shadow-primary/5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm">
                        ST
                      </div>
                      <div>
                        <h4 className="font-extrabold text-foreground text-xs md:text-sm leading-snug">Case File</h4>
                        <p className="text-muted-foreground text-xs font-mono">ID: {student.studentId.substring(0, 12)}...</p>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alert Incident Count:</span>
                        <b className="text-foreground">{student.alertCount} Flag(s)</b>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Incident Date:</span>
                        <span className="text-foreground">{new Date(student.lastAlert).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-bold mt-4 tracking-wider uppercase flex items-center">Open Case Folder →</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-out Student Profile Detail Panel (Right Sidebar Sheet) */}
      {selectedStudentId && (
        <StudentDetailSheet 
          studentId={selectedStudentId} 
          onClose={() => setSelectedStudentId(null)} 
        />
      )}
    </div>
  );
};

// Sub-component rendering the student profile modal (slide-out Sheet details)
interface StudentDetailSheetProps {
  studentId: string;
  onClose: () => void;
}

const StudentDetailSheet: React.FC<StudentDetailSheetProps> = ({ studentId, onClose }) => {
  const { theme } = useTheme();
  // 1. Load details using react-query hooks
  const { data: latestAssessment, isLoading: isProfileLoading } = useLatestAssessment(studentId);
  const { data: moodHistory, isLoading: isHistoryLoading } = useMoodHistory("7d"); // get student history

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300 text-foreground">
      
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between bg-background/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm md:text-base text-foreground">Student Case File</h4>
            <p className="text-muted-foreground text-xs md:text-sm">ID: {studentId.substring(0, 18)}...</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body details */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {isProfileLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-xs md:text-sm text-muted-foreground">Loading student clinical indicators...</p>
          </div>
        ) : !latestAssessment ? (
          <p className="text-xs md:text-sm text-muted-foreground">No profile records found for this user.</p>
        ) : (
          <>
            {/* Risk details block */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/50 bg-background/30 p-4 rounded-xl">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Wellness Score</p>
                <h5 className="text-2xl font-extrabold text-foreground mt-1">{latestAssessment.mental_wellness_score}</h5>
                <p className="text-muted-foreground text-xs mt-1">Scale bounds: 0.0 - 100.0</p>
              </Card>

              <Card className="border-border/50 bg-background/30 p-4 rounded-xl">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Risk Level</p>
                <h5 className="text-2xl font-extrabold text-foreground mt-1 flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  {latestAssessment.risk_level}
                </h5>
                <p className="text-muted-foreground text-xs mt-1">Status queue: Flagged</p>
              </Card>
            </div>

            {/* Emotions detected */}
            <Card className="border-border/50 bg-background/30 p-4 rounded-xl">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">Extracted NLP Emotions</p>
              <div className="space-y-2">
                {Object.entries(latestAssessment.emotions_detected).map(([emotion, prob]) => (
                  <div key={emotion} className="space-y-1">
                    <div className="flex justify-between text-xs md:text-sm font-semibold">
                      <span className="capitalize text-foreground/90">{emotion}</span>
                      <span className="text-muted-foreground">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recharts history chart */}
            <Card className="border-border/50 bg-background/30 p-4 rounded-xl">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">Historical Trajectory</p>
              <div className="h-44">
                {isHistoryLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moodHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="logged_at" stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={8} tickFormatter={(str) => {
                        try {
                          return new Date(str).toLocaleDateString([], { month: "short", day: "numeric" });
                        } catch {
                          return str;
                        }
                      }} />
                      <YAxis stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={8} domain={[1, 10]} />
                      <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }} />
                      <Line type="monotone" dataKey="self_reported_score" name="Score" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-background/20 text-center">
        <Button 
          onClick={onClose}
          className="w-full bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs md:text-sm py-2.5 rounded-xl transition-all duration-300"
        >
          Close Case File
        </Button>
      </div>
    </div>
  );
};
export default CounselorDashboard;
