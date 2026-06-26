import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export interface RecommendationActivity {
  type: string;
  title: string;
  url: string;
}

export interface RecommendationsResponse {
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  activities: RecommendationActivity[];
}

export const useCurrentRecommendations = () => {
  return useQuery<RecommendationsResponse>({
    queryKey: ["current-recommendations"],
    queryFn: async () => {
      const response = await api.get("/recommendations/current");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
