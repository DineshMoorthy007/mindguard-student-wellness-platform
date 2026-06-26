import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useUserNotifications = () => {
  return useQuery<NotificationItem[]>({
    queryKey: ["user-notifications"],
    queryFn: async () => {
      const response = await api.get("/notifications");
      return response.data.notifications;
    },
    staleTime: 1 * 60 * 1000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["counselor-alerts"] });
    },
  });
};
