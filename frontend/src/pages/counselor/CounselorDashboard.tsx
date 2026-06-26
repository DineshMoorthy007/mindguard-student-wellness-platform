import React, { useState } from "react";
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
  AlertCircle, CheckCircle2, Clock, X, ChevronRight, User as UserIcon, Loader2 
} from "lucide-react";

export const CounselorDashboard: React.FC = () => {
  const { toast } = useToast();
  
  // Sidebar/Filter state
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 1. Fetching Alerts Queue
  const { data: alertsData, isLoading: isAlertsLoading } = useCounselorAlerts(statusFilter);
  const updateStatusMutation = useUpdateAlertStatus(statusFilter);

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

  return (
    <div className="relative space-y-6 min-h-[calc(100vh-80px)]">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-white text-md font-bold">Active Intervention Alerts</h3>
          <p className="text-slate-400 text-xs mt-0.5">Triage high-risk clinical warnings flagged by student check-ins</p>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          {(["PENDING", "REVIEWED", "RESOLVED", ""] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                statusFilter === filter
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {filter === "" ? "All Alerts" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Alerts Queue Table */}
      <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          {isAlertsLoading ? (
            <div className="space-y-3 p-6">
              <div className="h-10 rounded-lg bg-slate-900/50 animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-900/50 animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-900/50 animate-pulse" />
            </div>
          ) : !alertsData || alertsData.alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-16">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mb-3 animate-bounce" />
              <h4 className="text-slate-300 font-bold text-sm">All caught up! No active warnings.</h4>
              <p className="text-slate-500 text-xs max-w-xs mt-1">There are no alerts matching the selected status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-slate-300 text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold bg-slate-950/20">
                    <th className="p-4 uppercase tracking-wider">Created At</th>
                    <th className="p-4 uppercase tracking-wider">Student Reference</th>
                    <th className="p-4 uppercase tracking-wider">Risk Severity</th>
                    <th className="p-4 uppercase tracking-wider">Assessment ID</th>
                    <th className="p-4 uppercase tracking-wider">Workflow Status</th>
                    <th className="p-4 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {alertsData.alerts.map((alert) => (
                    <tr 
                      key={alert.id}
                      className="hover:bg-slate-900/10 cursor-pointer group"
                      onClick={() => setSelectedStudentId(alert.student_id)}
                    >
                      <td className="p-4 text-slate-400">
                        {new Date(alert.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-4 font-bold text-white group-hover:text-violet-400 transition-colors flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                        {alert.student_id.substring(0, 8)}...
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] tracking-wide bg-red-600/15 text-red-400 border border-red-500/20">
                          HIGH
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{alert.assessment_id.substring(0, 12)}...</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          alert.status === "PENDING" 
                            ? "text-red-400" 
                            : alert.status === "REVIEWED" 
                            ? "text-amber-400" 
                            : "text-emerald-400"
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
                              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px] h-7 px-2.5 rounded"
                            >
                              Claim Alert
                            </Button>
                          )}
                          {alert.status !== "RESOLVED" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(alert.id, "RESOLVED")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] h-7 px-2.5 rounded"
                            >
                              Close Alert
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedStudentId(alert.student_id)}
                            className="text-slate-400 hover:text-slate-200 h-7 px-2 text-[10px] flex items-center"
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
  // 1. Load details using react-query hooks
  const { data: latestAssessment, isLoading: isProfileLoading } = useLatestAssessment(studentId);
  const { data: moodHistory, isLoading: isHistoryLoading } = useMoodHistory("7d"); // get student history

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Student Case File</h4>
            <p className="text-slate-500 text-xs">ID: {studentId.substring(0, 18)}...</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Body details */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {isProfileLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
            <p className="text-xs text-slate-500">Loading student clinical indicators...</p>
          </div>
        ) : !latestAssessment ? (
          <p className="text-xs text-slate-500">No profile records found for this user.</p>
        ) : (
          <>
            {/* Risk details block */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-slate-800 bg-slate-950/40 p-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Wellness Score</p>
                <h5 className="text-2xl font-extrabold text-white mt-1">{latestAssessment.mental_wellness_score}</h5>
                <p className="text-slate-500 text-[10px] mt-1">Scale bounds: 0.0 - 100.0</p>
              </Card>

              <Card className="border-slate-800 bg-slate-950/40 p-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Risk Level</p>
                <h5 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  {latestAssessment.risk_level}
                </h5>
                <p className="text-slate-500 text-[10px] mt-1">Status queue: Flagged</p>
              </Card>
            </div>

            {/* Emotions detected */}
            <Card className="border-slate-800 bg-slate-950/40 p-4">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Extracted NLP Emotions</p>
              <div className="space-y-2">
                {Object.entries(latestAssessment.emotions_detected).map(([emotion, prob]) => (
                  <div key={emotion} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-slate-300">{emotion}</span>
                      <span className="text-slate-500">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-600 rounded-full" 
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recharts history chart */}
            <Card className="border-slate-800 bg-slate-950/40 p-4">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Historical Trajectory</p>
              <div className="h-44">
                {isHistoryLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moodHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="logged_at" stroke="#475569" fontSize={8} tickFormatter={(str) => {
                        try {
                          return new Date(str).toLocaleDateString([], { month: "short", day: "numeric" });
                        } catch {
                          return str;
                        }
                      }} />
                      <YAxis stroke="#475569" fontSize={8} domain={[1, 10]} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "10px" }} />
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
      <div className="p-6 border-t border-slate-800 bg-slate-950/20 text-center">
        <Button 
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 rounded-lg"
        >
          Close Case File
        </Button>
      </div>
    </div>
  );
};
export default CounselorDashboard;
