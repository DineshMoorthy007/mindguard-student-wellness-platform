import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export interface AlertItem {
  id: string;
  student_id: string;
  assessment_id: string;
  status: "PENDING" | "REVIEWED" | "RESOLVED";
  created_at: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  total: number;
}

export interface AlertUpdatePayload {
  id: string;
  status: "PENDING" | "REVIEWED" | "RESOLVED";
}

export const useCounselorAlerts = (statusFilter?: string, limit: number = 50) => {
  return useQuery<AlertsResponse>({
    queryKey: ["counselor-alerts", statusFilter, limit],
    queryFn: async () => {
      const url = statusFilter 
        ? `/counselors/alerts?status=${statusFilter}&limit=${limit}` 
        : `/counselors/alerts?limit=${limit}`;
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 0, // Alerts triage lists should always be fresh as per specs
  });
};

export const useUpdateAlertStatus = (statusFilter?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AlertUpdatePayload) => {
      const response = await api.put(`/counselors/alerts/${payload.id}`, { status: payload.status });
      return response.data;
    },
    // Enforce optimistic UI updates
    onMutate: async (newAlertState) => {
      const queryKey = ["counselor-alerts", statusFilter, 50];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AlertsResponse>(queryKey);

      // Optimistically update query data cache
      if (previousData) {
        queryClient.setQueryData<AlertsResponse>(queryKey, {
          ...previousData,
          alerts: previousData.alerts.map((alert) =>
            alert.id === newAlertState.id
              ? { ...alert, status: newAlertState.status }
              : alert
          ),
        });
      }

      // Return context with rollback snapshot
      return { previousData, queryKey };
    },
    onError: (err, newAlertState, context) => {
      // Rollback on failure
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Always sync cache on resolution
      queryClient.invalidateQueries({ queryKey: ["counselor-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
};
