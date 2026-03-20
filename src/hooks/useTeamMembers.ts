import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { TeamMember } from "@/types/team";

type TeamListResponse = {
  data: TeamMember[];
};

export const useTeamMembers = (options?: { includeInactive?: boolean }) => {
  const includeInactive = options?.includeInactive ?? false;
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = includeInactive ? "?includeInactive=true" : "";
      const response = await apiRequest<TeamListResponse>(`/team${query}`);
      setTeamMembers(response.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load team members.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void loadTeamMembers();
  }, [loadTeamMembers]);

  useEffect(() => {
    const handleTeamChange = () => {
      void loadTeamMembers();
    };
    window.addEventListener("crm:team-changed", handleTeamChange);
    return () => {
      window.removeEventListener("crm:team-changed", handleTeamChange);
    };
  }, [loadTeamMembers]);

  return {
    teamMembers,
    isLoading,
    error,
    refresh: loadTeamMembers,
  };
};
