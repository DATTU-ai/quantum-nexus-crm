import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, hasStoredAuthToken } from "@/lib/apiClient";
import { pipeline_api_endpoints } from "@/lib/pipelineApi";
import { normalizeLeadRecord, type PublicLeadResponseItem } from "@/lib/publicLeadApi";
import type {
  CreateLeadInput,
  CreateOpportunityInput,
  ImportLeadsInput,
  LeadPipelineStage,
  OpportunityPipelineStage,
  PipelineDeal,
  ScheduleDemoInput,
} from "@/types/pipeline";

type ListResponse<T> = {
  data: T[];
};

type EntityResponse<T> = {
  data: T;
  generatedOrderId?: string | null;
};

interface PipelineContextValue {
  leadRecords: PipelineDeal[];
  opportunityRecords: PipelineDeal[];
  moveLead: (dealId: string, targetStage: LeadPipelineStage) => Promise<void>;
  moveOpportunity: (dealId: string, targetStage: OpportunityPipelineStage) => Promise<void>;
  convertLeadToOpportunity: (dealId: string) => Promise<PipelineDeal | null>;
  addLead: (input: CreateLeadInput) => Promise<PipelineDeal>;
  importLeads: (input: ImportLeadsInput) => Promise<PipelineDeal[]>;
  createOpportunity: (input: CreateOpportunityInput) => Promise<PipelineDeal>;
  scheduleDemo: (input: ScheduleDemoInput) => Promise<PipelineDeal | null>;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

const emitDataChange = () => {
  window.dispatchEvent(new CustomEvent("crm:data-changed"));
  window.dispatchEvent(new CustomEvent("crm:orders-changed"));
};

export const PipelineProvider = ({ children }: { children: ReactNode }) => {
  const [leadRecords, setLeadRecords] = useState<PipelineDeal[]>([]);
  const [opportunityRecords, setOpportunityRecords] = useState<PipelineDeal[]>([]);

  const loadLeadRecords = useCallback(async () => {
    try {
      const leadResponse = await apiRequest<ListResponse<PublicLeadResponseItem>>(
        pipeline_api_endpoints.publicLeads,
      );
      setLeadRecords((leadResponse.data ?? []).map(normalizeLeadRecord));
    } catch (error) {
      console.error("API ERROR:", error);
      setLeadRecords([]);
    }
  }, []);

  const loadOpportunityRecords = useCallback(async () => {
    if (!hasStoredAuthToken()) {
      setOpportunityRecords([]);
      return;
    }

    try {
      const opportunityResponse = await apiRequest<ListResponse<PipelineDeal>>(
        pipeline_api_endpoints.opportunities,
      );
      setOpportunityRecords(opportunityResponse.data ?? []);
    } catch (error) {
      console.error("API ERROR:", error);
      setOpportunityRecords([]);
    }
  }, []);

  useEffect(() => {
    void loadLeadRecords();
    void loadOpportunityRecords();
  }, [loadLeadRecords, loadOpportunityRecords]);

  const moveLead = async (dealId: string, targetStage: LeadPipelineStage) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(pipeline_api_endpoints.lead(dealId), {
        method: "PUT",
        body: { status: targetStage },
      });
      setLeadRecords((current) =>
        current.map((record) => (record.id === dealId ? response.data : record)),
      );
      emitDataChange();
    } catch (error) {
      console.warn("Move lead failed:", error);
      throw error;
    }
  };

  const moveOpportunity = async (dealId: string, targetStage: OpportunityPipelineStage) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(
        pipeline_api_endpoints.opportunity(dealId),
        {
          method: "PUT",
          body: { stage: targetStage },
        },
      );
      setOpportunityRecords((current) =>
        current.map((record) => (record.id === dealId ? response.data : record)),
      );
      if (response.generatedOrderId) {
        window.dispatchEvent(new CustomEvent("crm:orders-changed"));
      }
      emitDataChange();
    } catch (error) {
      console.warn("Move opportunity failed:", error);
      throw error;
    }
  };

  const convertLeadToOpportunity = async (dealId: string) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(
        pipeline_api_endpoints.convertLead(dealId),
        {
          method: "POST",
        },
      );
      await loadLeadRecords();
      await loadOpportunityRecords();
      emitDataChange();
      return response.data;
    } catch (error) {
      console.warn("Convert lead failed:", error);
      return null;
    }
  };

  const addLead = async (input: CreateLeadInput) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(pipeline_api_endpoints.leads, {
        method: "POST",
        body: input,
      });
      await loadLeadRecords();
      emitDataChange();
      return response.data;
    } catch (error) {
      console.warn("Add lead failed:", error);
      throw error;
    }
  };

  const importLeads = async (input: ImportLeadsInput) => {
    try {
      const response = await apiRequest<ListResponse<PipelineDeal>>(pipeline_api_endpoints.importLeads, {
        method: "POST",
        body: input,
      });
      await loadLeadRecords();
      emitDataChange();
      return response.data;
    } catch (error) {
      console.warn("Import leads failed:", error);
      throw error;
    }
  };

  const createOpportunity = async (input: CreateOpportunityInput) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(
        pipeline_api_endpoints.opportunities,
        {
          method: "POST",
          body: input,
        },
      );
      await loadOpportunityRecords();
      emitDataChange();
      return response.data;
    } catch (error) {
      console.warn("Create opportunity failed:", error);
      throw error;
    }
  };

  const scheduleDemo = async (input: ScheduleDemoInput) => {
    try {
      const response = await apiRequest<EntityResponse<PipelineDeal>>(
        pipeline_api_endpoints.scheduleDemo(input.leadId),
        {
          method: "POST",
          body: input,
        },
      );
      await loadLeadRecords();
      emitDataChange();
      return response.data;
    } catch (error) {
      console.warn("Schedule demo failed:", error);
      return null;
    }
  };

  return (
    <PipelineContext.Provider
      value={{
        leadRecords,
        opportunityRecords,
        moveLead,
        moveOpportunity,
        convertLeadToOpportunity,
        addLead,
        importLeads,
        createOpportunity,
        scheduleDemo,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipelineData = () => {
  const context = useContext(PipelineContext);

  if (!context) {
    throw new Error("usePipelineData must be used within PipelineProvider.");
  }

  return context;
};

