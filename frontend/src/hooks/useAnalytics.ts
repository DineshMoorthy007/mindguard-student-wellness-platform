import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export interface InstitutionReport {
  total_students_monitored: number;
  average_wellness_score: number;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  dominant_campus_emotion: string;
}

export const useInstitutionReport = (startDate?: string, endDate?: string) => {
  return useQuery<InstitutionReport>({
    queryKey: ["institution-report", startDate, endDate],
    queryFn: async () => {
      let url = "/analytics/institution/reports";
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 0, // Analytics should always reflect fresh DB metrics when requested
  });
};
