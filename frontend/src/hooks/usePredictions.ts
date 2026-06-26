import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export interface LatestAssessment {
  assessment_id: string;
  mental_wellness_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  emotions_detected: Record<string, number>;
  evaluated_at: string;
}

export const useLatestAssessment = (studentId?: string) => {
  return useQuery<LatestAssessment>({
    queryKey: ["latest-assessment", studentId],
    queryFn: async () => {
      const url = studentId 
        ? `/predictions/assessment/latest?student_id=${studentId}`
        : "/predictions/assessment/latest";
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};
