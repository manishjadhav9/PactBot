import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/auth/current-user");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch current user:", error);
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};