import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/apiClient";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationRuleRecord, EmailTemplateRecord, PipelineStageRecord, SettingRecord } from "@/types/settings";

type ListResponse<T> = { data: T };

const SettingsPage = () => {
  const { teamMembers, isLoading: isTeamLoading } = useTeamMembers({ includeInactive: true });
  const [leadStages, setLeadStages] = useState<PipelineStageRecord[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<PipelineStageRecord[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateRecord[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRuleRecord[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [newLeadStage, setNewLeadStage] = useState("");
  const [newOpportunityStage, setNewOpportunityStage] = useState("");
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "lead",
    subject: "",
    body: "",
  });

  const roleCounts = useMemo(() => {
    return teamMembers.reduce<Record<string, number>>((accumulator, member) => {
      accumulator[member.role] = (accumulator[member.role] || 0) + 1;
      return accumulator;
    }, {});
  }, [teamMembers]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [leadResponse, opportunityResponse, templateResponse, currencyResponse, automationResponse] = await Promise.all([
          apiRequest<ListResponse<PipelineStageRecord[]>>("/pipeline-stages?entityType=lead"),
          apiRequest<ListResponse<PipelineStageRecord[]>>("/pipeline-stages?entityType=opportunity"),
          apiRequest<ListResponse<EmailTemplateRecord[]>>("/email-templates"),
          apiRequest<ListResponse<SettingRecord>>("/settings/currency"),
          apiRequest<ListResponse<AutomationRuleRecord[]>>("/automation-rules"),
        ]);
        setLeadStages((leadResponse.data ?? []).sort((left, right) => left.order - right.order));
        setOpportunityStages((opportunityResponse.data ?? []).sort((left, right) => left.order - right.order));
        setEmailTemplates(templateResponse.data ?? []);
        setCurrency(currencyResponse.data?.value || "USD");
        setAutomationRules(automationResponse.data ?? []);
      } catch (error) {
        console.error("Settings load failed:", error);
      }
    };

    void loadSettings();
  }, []);

  const updateStageField = (
    entityType: "lead" | "opportunity",
    id: string,
    field: keyof PipelineStageRecord,
    value: string | number | boolean,
  ) => {
    const setter = entityType === "lead" ? setLeadStages : setOpportunityStages;
    setter((current) =>
      current.map((stage) => (stage.id === id ? { ...stage, [field]: value } : stage)),
    );
  };

  const saveStage = async (entityType: "lead" | "opportunity", stage: PipelineStageRecord) => {
    try {
      const response = await apiRequest<ListResponse<PipelineStageRecord>>(`/pipeline-stages/${stage.id}`, {
        method: "PATCH",
        body: {
          name: stage.name,
          order: stage.order,
          active: stage.active,
        },
      });
      const updated = response.data;
      const setter = entityType === "lead" ? setLeadStages : setOpportunityStages;
      setter((current) =>
        current.map((item) => (item.id === stage.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      console.error("Pipeline stage update failed:", error);
    }
  };

  const addStage = async (entityType: "lead" | "opportunity") => {
    const name = entityType === "lead" ? newLeadStage.trim() : newOpportunityStage.trim();
    if (!name) return;

    try {
      const response = await apiRequest<ListResponse<PipelineStageRecord>>("/pipeline-stages", {
        method: "POST",
        body: { name, entityType },
      });
      const created = response.data;
      const setter = entityType === "lead" ? setLeadStages : setOpportunityStages;
      setter((current) => [...current, created].sort((left, right) => left.order - right.order));
      if (entityType === "lead") setNewLeadStage("");
      else setNewOpportunityStage("");
    } catch (error) {
      console.error("Create pipeline stage failed:", error);
    }
  };

  const deleteStage = async (entityType: "lead" | "opportunity", id: string) => {
    try {
      await apiRequest(`/pipeline-stages/${id}`, { method: "DELETE" });
      const setter = entityType === "lead" ? setLeadStages : setOpportunityStages;
      setter((current) => current.filter((stage) => stage.id !== id));
    } catch (error) {
      console.error("Delete pipeline stage failed:", error);
    }
  };

  const updateTemplateField = (
    id: string,
    field: keyof EmailTemplateRecord,
    value: string | boolean,
  ) => {
    setEmailTemplates((current) =>
      current.map((template) => (template.id === id ? { ...template, [field]: value } : template)),
    );
  };

  const saveTemplate = async (template: EmailTemplateRecord) => {
    try {
      const response = await apiRequest<ListResponse<EmailTemplateRecord>>(`/email-templates/${template.id}`, {
        method: "PATCH",
        body: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          type: template.type,
          active: template.active,
        },
      });
      const updated = response.data;
      setEmailTemplates((current) =>
        current.map((item) => (item.id === template.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      console.error("Update email template failed:", error);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiRequest(`/email-templates/${id}`, { method: "DELETE" });
      setEmailTemplates((current) => current.filter((template) => template.id !== id));
    } catch (error) {
      console.error("Delete email template failed:", error);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()) return;
    try {
      const response = await apiRequest<ListResponse<EmailTemplateRecord>>("/email-templates", {
        method: "POST",
        body: newTemplate,
      });
      setEmailTemplates((current) => [response.data, ...current]);
      setNewTemplate({ name: "", type: "lead", subject: "", body: "" });
    } catch (error) {
      console.error("Create email template failed:", error);
    }
  };

  const saveCurrency = async () => {
    try {
      await apiRequest<ListResponse<SettingRecord>>("/settings/currency", {
        method: "PUT",
        body: { value: currency },
      });
    } catch (error) {
      console.error("Currency update failed:", error);
    }
  };

  const updateAutomationRule = async (rule: AutomationRuleRecord) => {
    try {
      const response = await apiRequest<ListResponse<AutomationRuleRecord>>(`/automation-rules/${rule.id}`, {
        method: "PATCH",
        body: {
          name: rule.name,
          trigger: rule.trigger,
          action: rule.action,
          config: rule.config,
          active: rule.active,
        },
      });
      const updated = response.data;
      setAutomationRules((current) =>
        current.map((item) => (item.id === rule.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      console.error("Automation rule update failed:", error);
    }
  };

  const runAutomation = async () => {
    try {
      await apiRequest("/automation-rules/run", { method: "POST" });
    } catch (error) {
      console.error("Automation run failed:", error);
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure users, pipeline stages, templates, and system preferences.</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Stages</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <section className="glass-card p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">User Management</h2>
                <p className="section-subtitle">Manage active team members and access roles.</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/team">Open Team Management</Link>
              </Button>
            </div>

            {isTeamLoading ? (
              <p className="text-sm text-muted-foreground">Loading team members...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{member.active ? "Active" : "Inactive"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        <TabsContent value="roles">
          <section className="glass-card p-6 space-y-4">
            <div>
              <h2 className="section-title">Roles</h2>
              <p className="section-subtitle">Overview of assigned roles across the organization.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className="rounded-xl border border-border/70 bg-secondary/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{role}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{count}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Members with this role.</p>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="pipeline">
          <section className="space-y-6">
            {[{ label: "Lead Pipeline Stages", key: "lead", stages: leadStages, newValue: newLeadStage, setValue: setNewLeadStage }, { label: "Opportunity Pipeline Stages", key: "opportunity", stages: opportunityStages, newValue: newOpportunityStage, setValue: setNewOpportunityStage }].map((section) => (
              <div key={section.key} className="glass-card p-6 space-y-4">
                <div>
                  <h2 className="section-title">{section.label}</h2>
                  <p className="section-subtitle">Control stage labels and ordering for this pipeline.</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.stages.map((stage) => (
                      <TableRow key={stage.id}>
                        <TableCell>
                          <Input
                            value={stage.name}
                            onChange={(event) => updateStageField(section.key as "lead" | "opportunity", stage.id, "name", event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={stage.order}
                            onChange={(event) => updateStageField(section.key as "lead" | "opportunity", stage.id, "order", Number(event.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={stage.active}
                            onCheckedChange={(value) => updateStageField(section.key as "lead" | "opportunity", stage.id, "active", value)}
                          />
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" onClick={() => saveStage(section.key as "lead" | "opportunity", stage)}>Save</Button>
                          <Button variant="ghost" onClick={() => deleteStage(section.key as "lead" | "opportunity", stage.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Add new stage"
                    value={section.newValue}
                    onChange={(event) => section.setValue(event.target.value)}
                  />
                  <Button onClick={() => addStage(section.key as "lead" | "opportunity")}>Add Stage</Button>
                </div>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="automation">
          <section className="glass-card p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Automation Rules</h2>
                <p className="section-subtitle">Enable or disable the built-in CRM automation rules.</p>
              </div>
              <Button variant="outline" onClick={runAutomation}>Run Inactivity Scan</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automationRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-foreground">{rule.name}</TableCell>
                    <TableCell>{rule.trigger}</TableCell>
                    <TableCell>{rule.action}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(value) =>
                          setAutomationRules((current) =>
                            current.map((item) => (item.id === rule.id ? { ...item, active: value } : item)),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" onClick={() => updateAutomationRule(rule)}>Save</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="templates">
          <section className="glass-card p-6 space-y-6">
            <div>
              <h2 className="section-title">Email Templates</h2>
              <p className="section-subtitle">Maintain reusable email templates for outreach and follow-ups.</p>
            </div>

            <div className="space-y-4">
              {emailTemplates.map((template) => (
                <div key={template.id} className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={template.name} onChange={(event) => updateTemplateField(template.id, "name", event.target.value)} />
                    <Input value={template.type} onChange={(event) => updateTemplateField(template.id, "type", event.target.value)} />
                  </div>
                  <Input value={template.subject} onChange={(event) => updateTemplateField(template.id, "subject", event.target.value)} />
                  <Textarea value={template.body} onChange={(event) => updateTemplateField(template.id, "body", event.target.value)} />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Switch checked={template.active} onCheckedChange={(value) => updateTemplateField(template.id, "active", value)} />
                      Active
                    </div>
                    <Button variant="outline" onClick={() => saveTemplate(template)}>Save</Button>
                    <Button variant="ghost" onClick={() => deleteTemplate(template.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Add Template</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Template name"
                  value={newTemplate.name}
                  onChange={(event) => setNewTemplate((current) => ({ ...current, name: event.target.value }))}
                />
                <Select value={newTemplate.type} onValueChange={(value) => setNewTemplate((current) => ({ ...current, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead Outreach</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Subject"
                value={newTemplate.subject}
                onChange={(event) => setNewTemplate((current) => ({ ...current, subject: event.target.value }))}
              />
              <Textarea
                placeholder="Email body"
                value={newTemplate.body}
                onChange={(event) => setNewTemplate((current) => ({ ...current, body: event.target.value }))}
              />
              <Button onClick={createTemplate}>Create Template</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="currency">
          <section className="glass-card p-6 space-y-4">
            <div>
              <h2 className="section-title">Currency Settings</h2>
              <p className="section-subtitle">Set the default reporting currency for the CRM.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={saveCurrency}>Save Currency</Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
