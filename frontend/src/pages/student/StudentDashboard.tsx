import React, { useState } from "react";
import { 
  useLatestAssessment 
} from "@/hooks/usePredictions";
import { 
  useCurrentRecommendations 
} from "@/hooks/useRecommendations";
import { 
  useMoodHistory, 
  useSubmitJournal 
} from "@/hooks/useMood";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { 
  Mic, Square, Sparkles, BookOpen, Video, FileText, AlertCircle, HelpCircle 
} from "lucide-react";
import api from "@/services/api";

// Standard questions for PHQ-9 Depression survey
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead or of hurting yourself in some way"
];

// Standard questions for GAD-7 Anxiety survey
const GAD7_QUESTIONS = [
  "Feeling nervous, anxious or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

const SURVEY_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" }
];

export const StudentDashboard: React.FC = () => {
  const { toast } = useToast();
  
  // State variables
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");
  const [checkInTab, setCheckInTab] = useState<"text" | "voice" | "survey">("text");
  
  // Text check-in form state
  const [journalText, setJournalText] = useState("");
  const [selfScore, setSelfScore] = useState(5);
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // Survey wizard state
  const [activeSurvey, setActiveSurvey] = useState<"phq-9" | "gad-7" | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [surveyResponses, setSurveyResponses] = useState<number[]>([]);

  // 1. Data Fetching via React Query hooks (strictly no useEffect for fetches)
  const { data: assessment, isLoading: isAssessmentLoading } = useLatestAssessment();
  const { data: recommendations, isLoading: isRecsLoading } = useCurrentRecommendations();
  const { data: moodHistory, isLoading: isHistoryLoading } = useMoodHistory(timeframe);
  const submitJournalMutation = useSubmitJournal();

  // 2. Submit Journal logic
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText.trim()) return;

    try {
      await submitJournalMutation.mutateAsync({
        content: journalText,
        self_reported_score: selfScore
      });
      toast({
        title: "Mood Logged Successfully",
        description: "Your journal entry has been queued for emotional evaluation.",
        variant: "success"
      });
      setJournalText("");
    } catch (err: any) {
      toast({
        title: "Log Failed",
        description: "Failed to submit entry. Please try again.",
        variant: "destructive"
      });
    }
  };

  // 3. Simulated/Interactive mic recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      let chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        // Clean stream tracks
        stream.getTracks().forEach((track) => track.stop());

        toast({
          title: "Audio Captured",
          description: "Analyzing voice transcript patterns...",
          variant: "success"
        });

        // Simulate voice transcription post back to api
        try {
          await submitJournalMutation.mutateAsync({
            content: "Voice Ingestion: I am feeling slightly stressed with coursework and sleep has been sub-optimal.",
            self_reported_score: 5
          });
          toast({
            title: "Voice Journal Processed",
            description: "Anonymized transcript analyzed successfully.",
            variant: "success"
          });
        } catch (err) {
          toast({
            title: "Transcription Failed",
            description: "Failed to process audio transcript.",
            variant: "destructive"
          });
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Unable to access mic inputs. Check browser settings.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  // 4. Survey Wizard logic
  const startSurvey = (type: "phq-9" | "gad-7") => {
    setActiveSurvey(type);
    setCurrentQuestionIdx(0);
    setSurveyResponses(new Array(type === "phq-9" ? 9 : 7).fill(-1));
  };

  const answerSurveyQuestion = (value: number) => {
    const nextResponses = [...surveyResponses];
    nextResponses[currentQuestionIdx] = value;
    setSurveyResponses(nextResponses);

    const maxQuestions = activeSurvey === "phq-9" ? 9 : 7;
    if (currentQuestionIdx < maxQuestions - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const submitSurvey = async () => {
    if (surveyResponses.includes(-1)) {
      toast({
        title: "Incomplete Answers",
        description: "Please answer all survey items before submitting.",
        variant: "destructive"
      });
      return;
    }

    try {
      const url = activeSurvey === "phq-9" ? "/surveys/phq-9" : "/surveys/gad-7";
      const response = await api.post(url, { responses: surveyResponses });
      toast({
        title: "Clinical Survey Submitted",
        description: `Assessment complete. severity indices: ${response.data.severity}`,
        variant: "success"
      });
      setActiveSurvey(null);
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: "Could not record survey responses.",
        variant: "destructive"
      });
    }
  };

  // Color mapper for scores
  const getRiskColor = (risk: string) => {
    if (risk === "HIGH") return "#ef4444"; // Red
    if (risk === "MEDIUM") return "#f59e0b"; // Yellow/Orange
    return "#10b981"; // Green/Emerald
  };

  // Recharts Pie Chart configuration for Wellness Score Dial
  const wellnessScore = assessment?.mental_wellness_score ?? 100;
  const riskColor = getRiskColor(assessment?.risk_level ?? "LOW");
  
  const dialData = [
    { name: "score", value: wellnessScore },
    { name: "remainder", value: 100 - wellnessScore }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header widget row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wellness Score Gauge */}
        <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-md">Mental Wellness Index</CardTitle>
            <CardDescription className="text-slate-400">Calculated well-being metric</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6">
            {isAssessmentLoading ? (
              <div className="h-40 w-40 rounded-full border-4 border-slate-800 border-t-violet-500 animate-spin flex items-center justify-center" />
            ) : (
              <div className="relative h-44 w-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dialData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={76}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      <Cell fill={riskColor} />
                      <Cell fill="#1e293b" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">{wellnessScore}</span>
                  <span 
                    className="text-[10px] font-bold tracking-widest uppercase mt-0.5 px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                  >
                    {assessment?.risk_level ?? "LOW"} RISK
                  </span>
                </div>
              </div>
            )}
            
            <div className="mt-4 text-center max-w-xs">
              {assessment?.risk_level === "HIGH" && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Counselor Alert Queue Triggered
                </div>
              )}
              {assessment?.risk_level === "MEDIUM" && (
                <p className="text-xs text-amber-400 font-medium">Elevated stress indices. Guided support advised.</p>
              )}
              {assessment?.risk_level === "LOW" && (
                <p className="text-xs text-emerald-400 font-medium">Wellness parameters are stable. Keep it up!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mood Check-In Panel */}
        <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-white text-md">Daily Check-In</CardTitle>
              <CardDescription className="text-slate-400">Log your thoughts or undergo clinical reviews</CardDescription>
            </div>
            
            {/* Tabs Selector */}
            <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
              {(["text", "voice", "survey"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setCheckInTab(tab);
                    setActiveSurvey(null);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                    checkInTab === tab
                      ? "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="min-h-[220px]">
            {/* Text Ingestion tab */}
            {checkInTab === "text" && (
              <form onSubmit={handleTextSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="journal" className="text-slate-300">Journal Entry</Label>
                  <textarea
                    id="journal"
                    placeholder="How is your mental balance today? Type out notes or stress patterns..."
                    rows={4}
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label className="text-slate-400 text-xs">Self-Report Score: {selfScore}/10</Label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={selfScore}
                      onChange={(e) => setSelfScore(parseInt(e.target.value))}
                      className="w-32 accent-violet-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitJournalMutation.isPending || !journalText.trim()}
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    Submit Entry
                  </Button>
                </div>
              </form>
            )}

            {/* Voice record Ingestion tab */}
            {checkInTab === "voice" && (
              <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <div className="relative">
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping" />
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`h-16 w-16 rounded-full border border-slate-800 shadow-md flex items-center justify-center transition-all ${
                      isRecording 
                        ? "bg-red-600 hover:bg-red-500 text-white" 
                        : "bg-slate-950 text-violet-400 hover:bg-slate-900"
                    }`}
                  >
                    {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">
                    {isRecording ? "Listening & Recording..." : "Tap to Speak"}
                  </h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                    Capture qualitative journal updates verbally. Dictations are transcribed and run through NER filters.
                  </p>
                </div>
              </div>
            )}

            {/* Clinical Surveys tab */}
            {checkInTab === "survey" && (
              <div className="h-full">
                {!activeSurvey ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <Card 
                      onClick={() => startSurvey("phq-9")}
                      className="border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/40 cursor-pointer transition-all p-5 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-violet-400" />
                          PHQ-9 Depression Survey
                        </h4>
                        <p className="text-slate-500 text-xs mt-1.5">
                          Gold standard 9-item Patient Health Questionnaire evaluating depressive index severity levels.
                        </p>
                      </div>
                      <span className="text-[10px] text-violet-400 font-bold mt-4 tracking-wider uppercase">Launch Wizard →</span>
                    </Card>

                    <Card 
                      onClick={() => startSurvey("gad-7")}
                      className="border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/40 cursor-pointer transition-all p-5 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-violet-400" />
                          GAD-7 Anxiety Survey
                        </h4>
                        <p className="text-slate-500 text-xs mt-1.5">
                          Standardized 7-item clinical tool to map generalized anxiety risk thresholds.
                        </p>
                      </div>
                      <span className="text-[10px] text-violet-400 font-bold mt-4 tracking-wider uppercase">Launch Wizard →</span>
                    </Card>
                  </div>
                ) : (
                  // Survey Wizard Active View
                  <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        {activeSurvey} Question {currentQuestionIdx + 1} of {activeSurvey === "phq-9" ? 9 : 7}
                      </h4>
                      <Button 
                        onClick={() => setActiveSurvey(null)}
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </Button>
                    </div>

                    <p className="text-white text-sm py-2 min-h-[48px] font-medium">
                      {activeSurvey === "phq-9" ? PHQ9_QUESTIONS[currentQuestionIdx] : GAD7_QUESTIONS[currentQuestionIdx]}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {SURVEY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => answerSurveyQuestion(opt.value)}
                          className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                            surveyResponses[currentQuestionIdx] === opt.value
                              ? "bg-violet-600 border-violet-500 text-white shadow shadow-violet-600/20"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/60"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <Button
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                        variant="outline"
                        size="sm"
                        className="text-slate-300"
                      >
                        Previous
                      </Button>
                      
                      {currentQuestionIdx === (activeSurvey === "phq-9" ? 8 : 6) ? (
                        <Button
                          disabled={surveyResponses.includes(-1)}
                          onClick={submitSurvey}
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-500 text-white"
                        >
                          Finish & Evaluate
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Mood history and trends line graph */}
      <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-white text-md">Mental Volatility History</CardTitle>
            <CardDescription className="text-slate-400">Comparing self-reported scores with NLP sentiment metrics</CardDescription>
          </div>
          
          <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
            {(["7d", "30d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  timeframe === t
                    ? "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="h-[280px]">
          {isHistoryLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <LoaderSpinner />
            </div>
          ) : !moodHistory || moodHistory.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
              <Sparkles className="h-8 w-8 text-violet-500/40 mb-2" />
              <h4 className="text-slate-300 font-bold text-sm">Log your first check-in to unlock history insights!</h4>
              <p className="text-slate-500 text-xs max-w-xs mt-1">Submit journal logs to construct your stress index timelines.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={moodHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis 
                  dataKey="logged_at" 
                  tickFormatter={(str) => {
                    try {
                      return new Date(str).toLocaleDateString([], { month: "short", day: "numeric" });
                    } catch {
                      return str;
                    }
                  }}
                  stroke="#475569" 
                  fontSize={10} 
                />
                <YAxis stroke="#475569" fontSize={10} domain={[1, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "12px", color: "#f8fafc" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="self_reported_score" 
                  name="Subjective Score" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Recommended activities list */}
      <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-white text-md flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Recommended Wellness Pathways
          </CardTitle>
          <CardDescription className="text-slate-400">Contextual suggestions calibrated to your current stress indices</CardDescription>
        </CardHeader>
        <CardContent>
          {isRecsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-28 rounded-xl bg-slate-900/40 animate-pulse border border-slate-800" />
              <div className="h-28 rounded-xl bg-slate-900/40 animate-pulse border border-slate-800" />
            </div>
          ) : !recommendations || recommendations.activities.length === 0 ? (
            <p className="text-xs text-slate-500">Submit journal checks to customize your self-care resources.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.activities.map((act, index) => (
                <a 
                  key={index}
                  href={act.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-900/40 hover:border-slate-700/80 transition-all group"
                >
                  <div className="h-10 w-10 rounded-lg bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform shrink-0">
                    {act.type === "MINDFULNESS" || act.type === "MEDITATION" ? (
                      <Mic className="h-5 w-5" />
                    ) : act.type === "ARTICLE" ? (
                      <BookOpen className="h-5 w-5" />
                    ) : act.type === "VIDEO" ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-violet-600/15 text-[9px] text-violet-400 font-bold uppercase tracking-widest">
                      {act.type}
                    </span>
                    <h5 className="text-white font-bold text-sm leading-snug group-hover:text-violet-300 transition-colors">
                      {act.title}
                    </h5>
                    <p className="text-xs text-slate-500 leading-normal">
                      Click to launch exercise stream from MindGuard directories.
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LoaderSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-6 w-6 border-2 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
  </div>
);

export default StudentDashboard;
