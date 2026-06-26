import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export interface MoodHistoryItem {
  id: string;
  input_type: string;
  self_reported_score: number;
  logged_at: string;
}

export interface JournalSubmission {
  content: string;
  self_reported_score: number;
}

export const useMoodHistory = (timeframe: string = "7d") => {
  return useQuery<MoodHistoryItem[]>({
    queryKey: ["mood-history", timeframe],
    queryFn: async () => {
      const response = await api.get(`/mood/history?timeframe=${timeframe}`);
      return response.data.history;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes standard caching
  });
};

export const useSubmitJournal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: JournalSubmission) => {
      const response = await api.post("/journal/entries", payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate mood history queries to refresh timeline feeds
      queryClient.invalidateQueries({ queryKey: ["mood-history"] });
      queryClient.invalidateQueries({ queryKey: ["latest-assessment"] });
      queryClient.invalidateQueries({ queryKey: ["current-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
};
