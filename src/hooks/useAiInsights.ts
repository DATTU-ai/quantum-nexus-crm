import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { CRM_INTERACTION_SAVED_EVENT } from "@/lib/crmEvents";
import type { RuleBasedInsightsPayload } from "@/types/ai";

type AiInsightsResponse = {
  data: RuleBasedInsightsPayload;
};

export const useAiInsights = (entityId: string | null) => {
  const [insights, setInsights] = useState<RuleBasedInsightsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const handleInteractionSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ entityId?: string }>).detail;
      if (!entityId || (detail?.entityId && detail.entityId !== entityId)) {
        return;
      }
      setRefreshToken((current) => current + 1);
    };

    window.addEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    return () => {
      window.removeEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    };
  }, [entityId]);

  useEffect(() => {
    let isActive = true;

    if (!entityId) {
      setInsights(null);
      setError(null);
      return undefined;
    }

    const loadInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<AiInsightsResponse>(`/ai/insights/${entityId}`);
        if (isActive) {
          setInsights(response.data);
        }
      } catch (err) {
        if (isActive) {
          setInsights(null);
          setError(err instanceof Error ? err.message : "Unable to load AI insights.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadInsights();

    return () => {
      isActive = false;
    };
  }, [entityId, refreshToken]);

  return { insights, isLoading, error };
};
