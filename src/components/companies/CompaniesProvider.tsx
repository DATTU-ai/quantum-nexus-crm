import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, hasStoredAuthToken } from "@/lib/apiClient";
import {
  company_api_endpoints,
} from "@/lib/companyApi";
import type {
  CompanyAIInsightRecord,
  CompanyActivityRecord,
  CompanyContactRecord,
  CompanyDetailRecord,
  CompanyDocumentRecord,
  CompanyLeadRecord,
  CompanyOpportunityRecord,
  CompanyRecord,
  CreateCompanyActivityInput,
  CreateCompanyContactInput,
  CreateCompanyDocumentInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/types/company";

type CompaniesListResponse = {
  data: {
    companies: CompanyRecord[];
    contacts: CompanyContactRecord[];
  };
};

type CompanyDetailResponse = {
  data: {
    company: CompanyRecord;
    contacts: CompanyContactRecord[];
    opportunities: CompanyOpportunityRecord[];
    leads: CompanyLeadRecord[];
    activities: CompanyActivityRecord[];
    documents: CompanyDocumentRecord[];
    ai_insight: CompanyAIInsightRecord | null;
  };
};

type EntityResponse<T> = { data: T };

interface CompaniesContextValue {
  companies: CompanyRecord[];
  contacts: CompanyContactRecord[];
  opportunities: CompanyOpportunityRecord[];
  activities: CompanyActivityRecord[];
  documents: CompanyDocumentRecord[];
  ai_insights: CompanyAIInsightRecord[];
  account_owners: string[];
  getCompanyById: (company_id: string) => CompanyRecord | null;
  getCompanyDetail: (company_id: string) => CompanyDetailRecord | null;
  loadCompanyDetail: (company_id: string) => Promise<CompanyDetailRecord | null>;
  createCompany: (input: CreateCompanyInput) => Promise<CompanyRecord>;
  updateCompany: (company_id: string, input: UpdateCompanyInput) => Promise<CompanyRecord | null>;
  deleteCompany: (company_id: string) => Promise<void>;
  listCompanyContacts: (company_id: string) => CompanyContactRecord[];
  createCompanyContact: (company_id: string, input: CreateCompanyContactInput) => Promise<CompanyContactRecord>;
  listCompanyOpportunities: (company_id: string) => CompanyOpportunityRecord[];
  createCompanyOpportunity: (company_id: string, input: CreateCompanyOpportunityInput) => Promise<CompanyOpportunityRecord>;
  listCompanyActivities: (company_id: string) => CompanyActivityRecord[];
  createCompanyActivity: (company_id: string, input: CreateCompanyActivityInput) => Promise<CompanyActivityRecord>;
  listCompanyDocuments: (company_id: string) => CompanyDocumentRecord[];
  createCompanyDocument: (company_id: string, input: CreateCompanyDocumentInput) => Promise<CompanyDocumentRecord>;
  getCompanyInsight: (company_id: string) => CompanyAIInsightRecord | null;
}

interface CreateCompanyOpportunityInput {
  opportunity_name: string;
  stage: string;
  deal_value: number;
  probability: number;
  expected_close_date: string;
  owner: string;
  status: string;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

const sortDesc = <T,>(records: T[], value: (record: T) => string) =>
  [...records].sort((left, right) => value(right).localeCompare(value(left)));

export const CompaniesProvider = ({ children }: { children: ReactNode }) => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [contacts, setContacts] = useState<CompanyContactRecord[]>([]);
  const [companyDetails, setCompanyDetails] = useState<Record<string, CompanyDetailRecord>>({});

  useEffect(() => {
    const loadCompanies = async () => {
      if (!hasStoredAuthToken()) {
        setCompanies([]);
        setContacts([]);
        return;
      }

      try {
        const response = await apiRequest<CompaniesListResponse>(company_api_endpoints.companies);
        setCompanies(response.data.companies ?? []);
        setContacts(response.data.contacts ?? []);
      } catch (error) {
        console.warn("Companies load failed:", error);
      }
    };

    void loadCompanies();
  }, []);

  const account_owners = useMemo(
    () =>
      [...new Set(companies.map((company) => company.account_owner))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [companies],
  );

  const opportunities = useMemo(
    () =>
      Object.values(companyDetails)
        .flatMap((detail) => detail.opportunities)
        .sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [companyDetails],
  );

  const activities = useMemo(
    () =>
      Object.values(companyDetails)
        .flatMap((detail) => detail.activities)
        .sort((left, right) => right.activity_date.localeCompare(left.activity_date)),
    [companyDetails],
  );

  const documents = useMemo(
    () =>
      Object.values(companyDetails)
        .flatMap((detail) => detail.documents)
        .sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [companyDetails],
  );

  const ai_insights = useMemo(
    () =>
      Object.values(companyDetails)
        .map((detail) => detail.ai_insight)
        .filter((value): value is CompanyAIInsightRecord => value !== null),
    [companyDetails],
  );

  const getCompanyById = (company_id: string) =>
    companies.find((company) => company.id === company_id) ?? null;

  const getCompanyDetail = (company_id: string) => companyDetails[company_id] ?? null;

  const loadCompanyDetail = async (company_id: string) => {
    try {
      const response = await apiRequest<CompanyDetailResponse>(company_api_endpoints.company(company_id));
      const detail: CompanyDetailRecord = {
        company: response.data.company,
        contacts: sortDesc(response.data.contacts ?? [], (item) => item.created_at),
        opportunities: sortDesc(response.data.opportunities ?? [], (item) => item.created_at),
        leads: sortDesc(response.data.leads ?? [], (item) => item.created_at),
        activities: sortDesc(response.data.activities ?? [], (item) => item.activity_date),
        documents: sortDesc(response.data.documents ?? [], (item) => item.created_at),
        ai_insight: response.data.ai_insight,
      };

      setCompanies((current) =>
        current.some((company) => company.id === detail.company.id)
          ? current.map((company) => (company.id === detail.company.id ? detail.company : company))
          : [detail.company, ...current],
      );
      setContacts((current) => {
        const withoutCompany = current.filter((contact) => contact.company_id !== company_id);
        return [...detail.contacts, ...withoutCompany];
      });
      setCompanyDetails((current) => ({
        ...current,
        [company_id]: detail,
      }));

      return detail;
    } catch (error) {
      console.warn("Company detail load failed:", error);
      return null;
    }
  };

  const createCompany = async (input: CreateCompanyInput) => {
    try {
      const response = await apiRequest<EntityResponse<CompanyRecord>>(company_api_endpoints.companies, {
        method: "POST",
        body: input,
      });
      setCompanies((current) => [response.data, ...current]);
      return response.data;
    } catch (error) {
      console.warn("Create company failed:", error);
      throw error;
    }
  };

  const updateCompany = async (_company_id: string, _input: UpdateCompanyInput) => {
    return null;
  };

  const deleteCompany = async (company_id: string) => {
    try {
      await apiRequest(company_api_endpoints.company(company_id), { method: "DELETE" });
      setCompanies((current) => current.filter((company) => company.id !== company_id));
      setContacts((current) => current.filter((contact) => contact.company_id !== company_id));
      setCompanyDetails((current) => {
        const next = { ...current };
        delete next[company_id];
        return next;
      });
    } catch (error) {
      console.warn("Delete company failed:", error);
      throw error;
    }
  };

  const listCompanyContacts = (company_id: string) =>
    getCompanyDetail(company_id)?.contacts ??
    sortDesc(
      contacts.filter((contact) => contact.company_id === company_id),
      (contact) => contact.created_at,
    );

  const createCompanyContact = async (company_id: string, input: CreateCompanyContactInput) => {
    try {
      const response = await apiRequest<EntityResponse<CompanyContactRecord>>(
        company_api_endpoints.contacts(company_id),
        {
          method: "POST",
          body: input,
        },
      );
      setContacts((current) => [response.data, ...current]);
      setCompanyDetails((current) => {
        const detail = current[company_id];
        if (!detail) return current;
        return {
          ...current,
          [company_id]: {
            ...detail,
            contacts: [response.data, ...detail.contacts],
          },
        };
      });
      return response.data;
    } catch (error) {
      console.warn("Create company contact failed:", error);
      throw error;
    }
  };

  const listCompanyOpportunities = (company_id: string) =>
    getCompanyDetail(company_id)?.opportunities ?? [];

  const createCompanyOpportunity = async (_company_id: string, _input: CreateCompanyOpportunityInput) => {
    throw new Error("Create company opportunity is not available in this UI flow yet.");
  };

  const listCompanyActivities = (company_id: string) =>
    getCompanyDetail(company_id)?.activities ?? [];

  const createCompanyActivity = async (company_id: string, input: CreateCompanyActivityInput) => {
    try {
      const response = await apiRequest<EntityResponse<CompanyActivityRecord>>(
        company_api_endpoints.activities(company_id),
        {
          method: "POST",
          body: input,
        },
      );
      setCompanyDetails((current) => {
        const detail = current[company_id];
        if (!detail) return current;
        return {
          ...current,
          [company_id]: {
            ...detail,
            activities: [response.data, ...detail.activities],
            ai_insight: detail.ai_insight
              ? { ...detail.ai_insight, engagement_level: "High" }
              : detail.ai_insight,
          },
        };
      });
      return response.data;
    } catch (error) {
      console.warn("Create company activity failed:", error);
      throw error;
    }
  };

  const listCompanyDocuments = (company_id: string) =>
    getCompanyDetail(company_id)?.documents ?? [];

  const createCompanyDocument = async (company_id: string, input: CreateCompanyDocumentInput) => {
    const formData = new FormData();
    formData.set("file_name", input.file_name);
    formData.set("uploaded_by", input.uploaded_by);
    formData.set("file_url", input.file_url);
    if (input.file) {
      formData.set("file", input.file);
    }

    try {
      const response = await apiRequest<EntityResponse<CompanyDocumentRecord>>(
        company_api_endpoints.documents(company_id),
        {
          method: "POST",
          formData,
        },
      );
      setCompanyDetails((current) => {
        const detail = current[company_id];
        if (!detail) return current;
        return {
          ...current,
          [company_id]: {
            ...detail,
            documents: [response.data, ...detail.documents],
          },
        };
      });
      return response.data;
    } catch (error) {
      console.warn("Create company document failed:", error);
      throw error;
    }
  };

  const getCompanyInsight = (company_id: string) =>
    getCompanyDetail(company_id)?.ai_insight ?? null;

  return (
    <CompaniesContext.Provider
      value={{
        companies,
        contacts,
        opportunities,
        activities,
        documents,
        ai_insights,
        account_owners,
        getCompanyById,
        getCompanyDetail,
        loadCompanyDetail,
        createCompany,
        updateCompany,
        deleteCompany,
        listCompanyContacts,
        createCompanyContact,
        listCompanyOpportunities,
        createCompanyOpportunity,
        listCompanyActivities,
        createCompanyActivity,
        listCompanyDocuments,
        createCompanyDocument,
        getCompanyInsight,
      }}
    >
      {children}
    </CompaniesContext.Provider>
  );
};

export const useCompaniesData = () => {
  const context = useContext(CompaniesContext);

  if (!context) {
    throw new Error("useCompaniesData must be used within CompaniesProvider.");
  }

  return context;
};

