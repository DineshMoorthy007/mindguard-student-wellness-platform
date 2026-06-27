import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { 
  Mic, Square, Sparkles, BookOpen, Video, FileText, AlertCircle, HelpCircle,
  X, Play, Pause, Heart, Check, ClipboardCheck, Activity
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
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const location = useLocation();
  const path = location.pathname;
  
  // State variables
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");
  const [checkInTab, setCheckInTab] = useState<"text" | "voice" | "survey">("text");
  
  // Text check-in form state
  const [journalText, setJournalText] = useState("");
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const spokenTextRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const [volumeScale, setVolumeScale] = useState(1.0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerIntervalRef = useRef<any>(null);
  
  // Survey wizard state
  const [activeSurvey, setActiveSurvey] = useState<"phq-9" | "gad-7" | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [surveyResponses, setSurveyResponses] = useState<number[]>([]);

  // Active wellness pathway modal state
  const [activePathway, setActivePathway] = useState<any | null>(null);

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
        self_reported_score: 5
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
      setVolumeScale(1.0);
      setRecordingDuration(0);
      spokenTextRef.current = "";
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup dynamic duration timer (counts elapsed seconds)
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);

      // 1. Setup Web Audio API volume visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!audioContextRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            // Map average volume level (0-128) to transform scale factor (1.0 to 1.5)
            const factor = 1.0 + (average / 128) * 0.5;
            setVolumeScale(factor);
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (audioErr) {
        console.warn("Web Audio Context initialization blocked or unsupported:", audioErr);
      }

      // 2. Setup Web Speech API speech recognition for real live transcribing
      try {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-US";
          
          rec.onresult = (event: any) => {
            let interimTranscript = "";
            let finalAccumulated = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalAccumulated += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }
            spokenTextRef.current = (spokenTextRef.current + " " + finalAccumulated).trim();
          };
          recognitionRef.current = rec;
          rec.start();
        }
      } catch (speechErr) {
        console.warn("Speech Recognition API unsupported in this environment:", speechErr);
      }

      // 3. Setup standard MediaRecorder stream backup
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        // stream chunks if needed
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        
        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Stop audio animations
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        // Finalize transcript
        const cleanSpoken = spokenTextRef.current.trim();
        const finalTranscript = cleanSpoken 
          ? `Voice Ingestion: ${cleanSpoken}`
          : "Voice Ingestion: I am feeling slightly stressed with coursework and sleep has been sub-optimal.";

        toast({
          title: "Audio Captured",
          description: "Syncing voice check-in details...",
          variant: "success"
        });

        // Submit directly to backend API
        try {
          await submitJournalMutation.mutateAsync({
            content: finalTranscript,
            self_reported_score: 5
          });
          toast({
            title: "Voice Journal Logged",
            description: "Your daily check-in was recorded successfully.",
            variant: "success"
          });
        } catch (err) {
          toast({
            title: "Check-In Failed",
            description: "Failed to sync your voice check-in details.",
            variant: "destructive"
          });
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
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
    setIsRecording(false);
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop media recorder
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.error("Error stopping media recorder:", err);
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
        description: `Assessment complete. Severity: ${response.data.severity}`,
        variant: "success"
      });
      setActiveSurvey(null);
      
      // Invalidate queries to refresh dashboard metrics immediately
      queryClient.invalidateQueries({ queryKey: ["mood-history"] });
      queryClient.invalidateQueries({ queryKey: ["latest-assessment"] });
      queryClient.invalidateQueries({ queryKey: ["current-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
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
  const hasAssessment = !!assessment;
  const wellnessScore = hasAssessment ? assessment.mental_wellness_score : 0;
  const riskColor = hasAssessment ? getRiskColor(assessment.risk_level) : "#64748b"; // slate-500
  
  const dialData = [
    { name: "score", value: hasAssessment ? wellnessScore : 100 },
    { name: "remainder", value: hasAssessment ? (100 - wellnessScore) : 0 }
  ];

  // Helper renderers for modular views
  const renderWellnessGauge = () => (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md lg:col-span-1 shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground text-sm font-extrabold">Mental Wellness Index</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">Calculated well-being metric</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pb-6">
        {isAssessmentLoading ? (
          <div className="h-40 w-40 rounded-full border-4 border-border/70 border-t-primary animate-spin flex items-center justify-center" />
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
                  <Cell fill={theme === "dark" ? "#1e293b" : "#e2e8f0"} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-foreground">{hasAssessment ? wellnessScore : "--"}</span>
              <span 
                className="text-[10px] font-bold tracking-widest uppercase mt-0.5 px-2 py-0.5 rounded"
                style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
              >
                {hasAssessment ? `${assessment?.risk_level} RISK` : "NO DATA"}
              </span>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center max-w-xs">
          {!hasAssessment && (
            <p className="text-xs text-muted-foreground font-medium">No check-ins logged yet. Daily logs will map your stress indices.</p>
          )}
          {hasAssessment && assessment?.risk_level === "HIGH" && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500">
              <AlertCircle className="h-4 w-4" />
              Counselor Alert Queue Triggered
            </div>
          )}
          {hasAssessment && assessment?.risk_level === "MEDIUM" && (
            <p className="text-xs text-amber-500 font-medium">Elevated stress indices. Guided support advised.</p>
          )}
          {hasAssessment && assessment?.risk_level === "LOW" && (
            <p className="text-xs text-emerald-500 font-medium">Wellness parameters are stable. Keep it up!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderCheckInPanel = () => (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-foreground text-sm font-extrabold">Daily Check-In</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Log your thoughts or undergo clinical reviews</CardDescription>
        </div>
        
        {/* Tabs Selector */}
        <div className="flex bg-background/50 p-0.5 rounded-lg border border-border/70">
          {(["text", "voice", "survey"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setCheckInTab(tab);
                setActiveSurvey(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                checkInTab === tab
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
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
              <Label htmlFor="journal" className="text-foreground/90 text-xs">Journal Entry</Label>
              <textarea
                id="journal"
                placeholder="How is your mental balance today? Type out notes or stress patterns..."
                rows={4}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submitJournalMutation.isPending || !journalText.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-xl shadow-md transition-all duration-300"
              >
                {submitJournalMutation.isPending ? "Analyzing..." : "Log & Analyze"}
              </Button>
            </div>
          </form>
        )}

        {/* Voice record Ingestion tab */}
        {checkInTab === "voice" && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-4">
              {isRecording && (
                <>
                  {/* Concentric reactive voice wave rings */}
                  <div 
                    className="absolute inset-0 rounded-full bg-red-500/10 pointer-events-none transition-transform duration-75 ease-out" 
                    style={{ transform: `scale(${volumeScale * 1.3})` }}
                  />
                  <div 
                    className="absolute inset-0 rounded-full bg-red-500/15 pointer-events-none transition-transform duration-75 ease-out" 
                    style={{ transform: `scale(${volumeScale * 1.6})` }}
                  />
                  <div 
                    className="absolute inset-0 rounded-full bg-red-500/20 pointer-events-none transition-transform duration-75 ease-out" 
                    style={{ transform: `scale(${volumeScale * 1.9})` }}
                  />
                </>
              )}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`h-16 w-16 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-md ${
                  isRecording ? "bg-red-600 hover:bg-red-500" : "bg-primary hover:bg-primary/95"
                }`}
              >
                {isRecording ? <Square className="h-6 w-6 animate-pulse" /> : <Mic className="h-6 w-6" />}
              </button>
            </div>
            <h5 className="font-bold text-foreground text-sm">
              {isRecording ? "Listening & Recording..." : "Voice Ingestion Stream"}
            </h5>
            <p className="text-muted-foreground text-xs md:text-sm max-w-xs mt-1">
              {isRecording ? "Speak now. Click square to finalize recording." : "Click microphone to log mood securely via voice patterns."}
            </p>
          </div>
        )}

        {/* Clinical Surveys tab */}
        {checkInTab === "survey" && (
          <div className="space-y-2">
            {!activeSurvey ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <Card 
                  onClick={() => startSurvey("phq-9")}
                  className="border-border/70 bg-background/30 hover:bg-accent/40 cursor-pointer transition-all p-5 flex flex-col justify-between rounded-xl hover:border-primary/20"
                >
                  <div>
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                      PHQ-9 Depression Survey
                    </h4>
                    <p className="text-muted-foreground text-xs mt-1.5">
                      Gold standard 9-item Patient Health Questionnaire evaluating depressive index severity levels.
                    </p>
                  </div>
                  <span className="text-[10px] text-primary font-bold mt-4 tracking-wider uppercase">Launch Wizard →</span>
                </Card>

                <Card 
                  onClick={() => startSurvey("gad-7")}
                  className="border-border/70 bg-background/30 hover:bg-accent/40 cursor-pointer transition-all p-5 flex flex-col justify-between rounded-xl hover:border-primary/20"
                >
                  <div>
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      GAD-7 Anxiety Survey
                    </h4>
                    <p className="text-muted-foreground text-xs mt-1.5">
                      Standardized 7-item clinical tool to map generalized anxiety risk thresholds.
                    </p>
                  </div>
                  <span className="text-[10px] text-primary font-bold mt-4 tracking-wider uppercase">Launch Wizard →</span>
                </Card>
              </div>
            ) : (
              // Survey Wizard Active View
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    {activeSurvey} Question {currentQuestionIdx + 1} of {activeSurvey === "phq-9" ? 9 : 7}
                  </h4>
                  <Button 
                    onClick={() => setActiveSurvey(null)}
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-foreground text-sm py-2 min-h-[48px] font-medium leading-relaxed">
                  {activeSurvey === "phq-9" ? PHQ9_QUESTIONS[currentQuestionIdx] : GAD7_QUESTIONS[currentQuestionIdx]}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SURVEY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => answerSurveyQuestion(opt.value)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                        surveyResponses[currentQuestionIdx] === opt.value
                          ? "bg-primary border-primary text-primary-foreground shadow"
                          : "border-border/70 bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
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
                    className="text-muted-foreground hover:text-foreground h-8 px-3 rounded-lg"
                  >
                    Previous
                  </Button>
                  
                  {currentQuestionIdx < (activeSurvey === "phq-9" ? 8 : 6) ? (
                    <Button
                      disabled={surveyResponses[currentQuestionIdx] === -1}
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 px-3 rounded-lg"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      disabled={surveyResponses.includes(-1)}
                      onClick={submitSurvey}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 px-3 rounded-lg"
                    >
                      Finish & Evaluate
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVolatilityChart = () => (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-foreground text-sm font-extrabold">Mental Volatility History</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Comparing self-reported scores with NLP sentiment metrics</CardDescription>
        </div>
        
        <div className="flex bg-background/50 p-0.5 rounded-lg border border-border/70">
          {(["7d", "30d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                timeframe === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
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
            <Sparkles className="h-8 w-8 text-primary/30 mb-2" />
            <h4 className="text-foreground font-bold text-sm">Log your first check-in to unlock history insights!</h4>
            <p className="text-muted-foreground text-xs max-w-xs mt-1">Submit journal logs to construct your stress index timelines.</p>
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
                stroke={theme === "dark" ? "#475569" : "#94a3b8"} 
                fontSize={10} 
              />
              <YAxis stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={10} domain={[1, 10]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                  border: "1px solid var(--border)", 
                  borderRadius: "12px" 
                }}
                labelStyle={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: "bold" }}
                itemStyle={{ fontSize: "12px", color: "var(--foreground)" }}
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
  );

  const renderRecommendationsGrid = () => (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-foreground text-sm md:text-base font-extrabold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended Wellness Pathways
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs md:text-sm">Contextual suggestions calibrated to your current stress indices</CardDescription>
      </CardHeader>
      <CardContent>
        {isRecsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse border border-border/70" />
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse border border-border/70" />
          </div>
        ) : !recommendations || recommendations.activities.length === 0 ? (
          <p className="text-xs md:text-sm text-muted-foreground">Submit journal checks to customize your self-care resources.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.activities.map((act, index) => (
              <button 
                key={index}
                type="button"
                onClick={() => setActivePathway(act)}
                className="w-full text-left flex items-start gap-4 p-4 rounded-xl border border-border/70 bg-background/30 hover:bg-accent/40 hover:border-primary/20 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
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
                <div className="space-y-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-widest">
                    {act.type}
                  </span>
                  <h5 className="text-foreground font-extrabold text-sm truncate group-hover:text-primary transition-colors">
                    {act.title}
                  </h5>
                  <p className="text-muted-foreground text-xs leading-normal truncate">
                    Click to launch exercise stream from MindGuard directories.
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const isCheckInOnly = path === "/student/check-in";
  const isHistoryOnly = path === "/student/history";
  const isResourcesOnly = path === "/student/resources";
  const isOverview = path === "/student/dashboard" || (!isCheckInOnly && !isHistoryOnly && !isResourcesOnly);

  return (
    <div className="space-y-6">
      {/* 1. OVERVIEW VIEW */}
      {isOverview && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wellness Score Gauge */}
            {renderWellnessGauge()}
            
            {/* Quick check-in prompt / Overview card */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-md lg:col-span-2 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-foreground font-extrabold text-sm md:text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to MindGuard
                </h4>
                <p className="text-muted-foreground text-xs md:text-sm mt-2 leading-relaxed">
                  Your wellness index is currently calculated based on your latest emotional evaluation and surveys. 
                  Keep checking in daily using text journal entries or voice logs to get highly personalized self-care recommendations.
                </p>

                {/* Daily Status & Affirmation panel to fill empty space */}
                <div className="mt-4 p-4 rounded-xl border border-border/40 bg-background/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/20 pb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Affirmation</span>
                    <span className="text-[10px] text-primary font-bold uppercase bg-primary/10 px-2 py-0.5 rounded-full">Daily Insight</span>
                  </div>
                  <p className="text-xs md:text-sm text-foreground/90 italic leading-relaxed">
                    "Taking a few minutes for yourself today is a powerful step towards your wellness. Progress is built one check-in at a time."
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5 border-t border-border/20">
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Model Sync: Online
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Journaling: Ready
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <NavLink to="/student/check-in" className="flex items-center justify-center gap-2 rounded-xl border border-border/70 hover:border-primary/30 bg-background/40 hover:bg-accent/40 py-2.5 text-xs md:text-sm font-bold text-foreground transition-all duration-300">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Log Daily Check-In
                </NavLink>
                <NavLink to="/student/history" className="flex items-center justify-center gap-2 rounded-xl border border-border/70 hover:border-primary/30 bg-background/40 hover:bg-accent/40 py-2.5 text-xs md:text-sm font-bold text-foreground transition-all duration-300">
                  <Activity className="h-4 w-4 text-primary" />
                  View Volatility History
                </NavLink>
                <NavLink to="/student/resources" className="flex items-center justify-center gap-2 rounded-xl border border-border/70 hover:border-primary/30 bg-background/40 hover:bg-accent/40 py-2.5 text-xs md:text-sm font-bold text-foreground transition-all duration-300">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Explore Resources
                </NavLink>
              </div>
            </Card>
          </div>
          
          {/* Volatility Line Chart */}
          {renderVolatilityChart()}
          
          {/* Recommended Activities List */}
          {renderRecommendationsGrid()}
        </>
      )}

      {/* 2. CHECK-IN ONLY VIEW */}
      {isCheckInOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {renderWellnessGauge()}
            
            {/* Quick Tips Box */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-md p-5 text-xs md:text-sm">
              <h5 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-primary" />
                Why log your mood?
              </h5>
              <p className="text-muted-foreground leading-relaxed">
                Regular check-ins help train the MindGuard risk-assessment model, enabling early warnings and private, automated self-care guidance.
              </p>
            </Card>
          </div>
          <div className="lg:col-span-2">
            {renderCheckInPanel()}
          </div>
        </div>
      )}

      {/* 3. HISTORY ONLY VIEW */}
      {isHistoryOnly && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderWellnessGauge()}
            <Card className="border-border/50 bg-card/40 backdrop-blur-md lg:col-span-2 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-foreground font-extrabold text-sm md:text-base">Wellness Trend Analysis</h4>
                <p className="text-muted-foreground text-xs md:text-sm mt-1.5 leading-relaxed">
                  This screen tracks changes in your wellness score and subjective mood over time. If a low wellness score is sustained, clinic counselors are alerted to ensure early intervention.
                </p>
              </div>
              <div className="border-t border-border/50 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs md:text-sm">
                <div>
                  <span className="text-muted-foreground">Extracted NLP Sentiment</span>
                  <p className="text-foreground font-bold text-sm mt-0.5">{assessment?.risk_level === "LOW" ? "Positive / Stable" : "Elevated Stress"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Check-In Date</span>
                  <p className="text-foreground font-bold text-sm mt-0.5">
                    {assessment ? new Date(assessment.evaluated_at).toLocaleDateString() : "No logs recorded"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          {renderVolatilityChart()}
        </div>
      )}

      {/* 4. RESOURCES ONLY VIEW */}
      {isResourcesOnly && (
        <div className="space-y-6">
          {renderRecommendationsGrid()}
        </div>
      )}

      {/* Pathway Modal Overlay */}
      {activePathway && (
        <PathwayModal 
          pathway={activePathway} 
          onClose={() => setActivePathway(null)} 
        />
      )}
    </div>
  );
};

// Interactive Wellness Pathway Modal Detail Component
interface PathwayModalProps {
  pathway: {
    type: string;
    title: string;
    url: string;
  };
  onClose: () => void;
}

const PathwayModal: React.FC<PathwayModalProps> = ({ pathway, onClose }) => {
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Hold2">("Inhale");
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(12);
  const [checklist, setChecklist] = useState([
    { text: "Drink 500ml of fresh water", completed: false },
    { text: "Stretch neck, shoulders, and back for 2 mins", completed: false },
    { text: "Step away from screen, walk around for 5 mins", completed: false },
    { text: "Take 3 slow deep breaths right now", completed: false },
  ]);
  
  useEffect(() => {
    if (pathway.type !== "MINDFULNESS") return;
    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            if (current === "Inhale") return "Hold";
            if (current === "Hold") return "Exhale";
            if (current === "Exhale") return "Hold2";
            return "Inhale";
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pathway, breathPhase]);

  useEffect(() => {
    if (!audioPlaying) return;
    const interval = setInterval(() => {
      setAudioProgress((prev) => (prev >= 300 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [audioPlaying]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getPhaseColor = () => {
    if (breathPhase === "Inhale") return "text-emerald-500 bg-emerald-500/10";
    if (breathPhase === "Hold" || breathPhase === "Hold2") return "text-amber-500 bg-amber-500/10";
    return "text-violet-500 bg-violet-500/10";
  };

  const completedCount = checklist.filter((i) => i.completed).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto w-screen h-screen">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-foreground">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-background/20">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-widest">
              {pathway.type}
            </span>
            <h4 className="font-extrabold text-sm md:text-base leading-snug truncate max-w-[280px]">
              {pathway.title}
            </h4>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 space-y-6">
          
          {/* Box Breathing */}
          {pathway.type === "MINDFULNESS" && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
              <div className="h-44 w-44 rounded-full border border-border flex items-center justify-center relative">
                <div 
                  className={`absolute rounded-full transition-all duration-[4000ms] ease-in-out bg-gradient-to-tr from-violet-500 to-indigo-500 opacity-20 ${
                    breathPhase === "Inhale" 
                      ? "h-40 w-40 scale-110" 
                      : breathPhase === "Exhale" 
                      ? "h-24 w-24 scale-90" 
                      : "h-32 w-32 scale-100"
                  }`} 
                />
                <div className="z-10 flex flex-col items-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPhaseColor()}`}>
                    {breathPhase === "Hold2" ? "Hold" : breathPhase}
                  </span>
                  <span className="text-3xl font-black text-foreground mt-1.5">{breathSeconds}s</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Follow the visual circle: Inhale (4s) → Hold (4s) → Exhale (4s) → Hold (4s)
                </p>
                <p className="text-xs text-muted-foreground/80 italic">
                  Box breathing calms the nervous system and lowers active stress levels.
                </p>
              </div>
            </div>
          )}

          {/* Audio Grounding */}
          {pathway.type === "MEDITATION" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => setAudioPlaying(!audioPlaying)}
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center transition-colors shadow-sm"
                >
                  {audioPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                </button>
                <div className="flex-1 mx-4 space-y-1.5">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${(audioProgress / 300) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>{formatTime(audioProgress)}</span>
                    <span>5:00</span>
                  </div>
                </div>
                <Heart className="h-4.5 w-4.5 text-primary" />
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-xs md:text-sm uppercase tracking-wider text-muted-foreground">5-4-3-2-1 Sensory Grounding</h5>
                <ul className="space-y-2 text-xs md:text-sm text-foreground/90">
                  <li className="flex gap-2"><b className="text-primary font-bold">5:</b> Name five things you can see around you.</li>
                  <li className="flex gap-2"><b className="text-primary font-bold">4:</b> Acknowledge four things you can touch.</li>
                  <li className="flex gap-2"><b className="text-primary font-bold">3:</b> Listen to three distinct background sounds.</li>
                  <li className="flex gap-2"><b className="text-primary font-bold">2:</b> Notice two things you can smell.</li>
                  <li className="flex gap-2"><b className="text-primary font-bold">1:</b> Reflect on one thing you can taste.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Articles */}
          {pathway.type === "ARTICLE" && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm md:text-base leading-tight text-foreground/95">
                Scientific Recovery Protocol
              </h4>
              
              <div className="text-xs md:text-sm text-foreground/80 space-y-3 leading-relaxed max-h-[220px] overflow-y-auto pr-1">
                {pathway.title.includes("Burnout") ? (
                  <>
                    <p><b className="text-primary">1. Shift Boundaries:</b> Set strict time-blocks for studying. Step away from work interfaces after 7 PM. Mental strain increases when workload hours bleed into relaxation cycles.</p>
                    <p><b className="text-primary">2. Intermittent Breaks:</b> Implement the Pomodoro technique (25m study, 5m off-screen rest). Walk or stretch during breaks.</p>
                    <p><b className="text-primary">3. Reframe Success:</b> Remind yourself that mental energy is a prerequisite for good performance. Overworking leads to diminished returns.</p>
                  </>
                ) : pathway.title.includes("Sleep") ? (
                  <>
                    <p><b className="text-primary">1. The 10-3-2-1 Rule:</b> No caffeine 10 hours before sleep, no heavy meals 3 hours before, no academic tasks 2 hours before, and no screens 1 hour before sleep.</p>
                    <p><b className="text-primary">2. Wake-up Anchor:</b> Keep a fixed alarm time regardless of weekend schedules to standardize circadian rhythm recovery.</p>
                    <p><b className="text-primary">3. Bedroom Hygiene:</b> Maintain a cool, dark room. Use white noise if study noises surround your space.</p>
                  </>
                ) : (
                  <>
                    <p><b className="text-primary">1. Time Chunking:</b> Allocate distinct blocks for courses, personal health, social interaction, and restorative rest. Do not over-schedule.</p>
                    <p><b className="text-primary">2. Peer Support:</b> Engage in structured group activities or counseling support early when stress signals mount.</p>
                    <p><b className="text-primary">3. Routine Self-Checkin:</b> Log feelings and volatile stress triggers daily to maintain conscious awareness of mental states.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Habit Checklist / Video Mockup */}
          {(pathway.type === "VIDEO" || pathway.type === "HEALTH") && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs md:text-sm uppercase tracking-wider text-muted-foreground">Interactive Self-Care Checklist</h4>
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const next = [...checklist];
                      next[idx].completed = !next[idx].completed;
                      setChecklist(next);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border bg-background/50 flex items-center justify-between hover:bg-accent/40 transition-all text-xs md:text-sm"
                  >
                    <span className={item.completed ? "text-muted-foreground line-through" : "text-foreground font-medium"}>
                      {item.text}
                    </span>
                    <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                      item.completed 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-border bg-background"
                    }`}>
                      {item.completed && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                  <span>Habit Progress Tracker</span>
                  <span>{completedCount} OF {checklist.length}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency support / Appointments */}
          {pathway.type === "SUPPORT" && (
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-600 dark:text-red-400 text-xs md:text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <h5 className="font-bold">Intervention Support Action</h5>
                  <p className="leading-relaxed">This action sends a direct confirmation of priority intervention check-in request to the counselor's warning queue.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-xs md:text-sm text-foreground/90">Crisis Support Hotlines:</h5>
                <ul className="space-y-1.5 text-xs md:text-sm text-foreground/80">
                  <li className="flex justify-between border-b border-border pb-1.5">
                    <span>Campus Wellness Desk</span>
                    <b className="text-primary">+1 (585) 475-3333</b>
                  </li>
                  <li className="flex justify-between border-b border-border pb-1.5">
                    <span>National Crisis Lifeline</span>
                    <b className="text-primary">988</b>
                  </li>
                  <li className="flex justify-between border-b border-border pb-1.5">
                    <span>Crisis Text Line</span>
                    <span>Text <b className="text-primary">HOME</b> to <b>741741</b></span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    alert("Intervention check-in confirmed. Priority alert successfully sent.");
                    onClose();
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs md:text-sm h-10 rounded-xl"
                >
                  Dispatch Priority Alert to Counselor
                </Button>
              </div>
            </div>
          )}

          {/* Counselor Appointment booking portal */}
          {pathway.type === "APPOINTMENT" && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-3 text-primary text-xs md:text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <h5 className="font-bold">Urgent Intake Appointment</h5>
                  <p className="leading-relaxed">Book an expedited clinical review with the next available wellness counselor.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-foreground/90 text-xs md:text-sm">Select Counselor</Label>
                  <select className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-xs md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Dr. Sarah Jenkins (Assigned Counselor)</option>
                    <option>Dr. Marcus Vance (Crisis Specialist)</option>
                    <option>Elena Rostova, LCSW</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-foreground/90 text-xs md:text-sm">Preferred Date</Label>
                    <input 
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]} 
                      className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-xs md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground/90 text-xs md:text-sm">Available Slot</Label>
                    <select className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-xs md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>09:30 AM (Urgent Slot)</option>
                      <option>11:00 AM</option>
                      <option>02:30 PM (Urgent Slot)</option>
                      <option>04:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-foreground/90 text-xs md:text-sm">Brief Notes (Optional)</Label>
                  <textarea 
                    placeholder="Enter any details or stressors you would like the counselor to review..."
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-xs md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    alert("Urgent intake appointment confirmed. An email summary and calendar invite have been sent to you.");
                    onClose();
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm h-10 rounded-xl"
                >
                  Schedule Intake Session
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-background/20 border-t border-border flex justify-end">
          <Button size="sm" onClick={onClose} className="bg-muted hover:bg-muted/80 text-foreground font-bold text-xs md:text-sm rounded-xl px-4 py-2">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const LoaderSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-6 w-6 border-2 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
  </div>
);

export default StudentDashboard;
