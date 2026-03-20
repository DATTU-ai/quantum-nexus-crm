import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarClock,
  FileText,
  Plus,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AddContactModal from "@/components/companies/AddContactModal";
import { formatCompanyDate, formatCompanyDateTime, getActivityTypeClassName, getCompanyStatusClassName, getEngagementClassName, getRiskClassName } from "@/components/companies/companyTheme";
import { useCompaniesData } from "@/components/companies/CompaniesProvider";
import LogActivityModal from "@/components/companies/LogActivityModal";
import UploadDocumentModal from "@/components/companies/UploadDocumentModal";
import InteractionTimeline from "@/components/timeline/InteractionTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/utils/currency";

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm leading-relaxed text-foreground">{value || "—"}</p>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[14px] border border-dashed border-border/80 bg-secondary/20 px-6 py-10 text-center">
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);

const CompanyDetailPage = () => {
  const { companyId = "" } = useParams();
  const {
    companies,
    account_owners,
    createCompanyActivity,
    createCompanyContact,
    createCompanyDocument,
    getCompanyDetail,
    loadCompanyDetail,
  } = useCompaniesData();
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isUploadDocumentOpen, setIsUploadDocumentOpen] = useState(false);

  const detail = useMemo(() => getCompanyDetail(companyId), [companyId, getCompanyDetail]);

  useEffect(() => {
    if (companyId) {
      void loadCompanyDetail(companyId);
    }
  }, [companyId, loadCompanyDetail]);

  if (!detail && companies.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-xl p-10 text-center">
          <p className="text-lg font-semibold text-foreground">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-xl p-10 text-center">
          <p className="text-lg font-semibold text-foreground">Company not found</p>
          <p className="mt-2 text-base text-muted-foreground">
            The requested company record does not exist in the current CRM dataset.
          </p>
          <Button asChild className="mt-6">
            <Link to="/companies">
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { company, contacts, opportunities, leads, activities, documents, ai_insight } = detail;

  return (
    <div className="relative max-w-[1600px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4">
        <Button asChild variant="outline" className="w-fit rounded-xl">
          <Link to="/companies">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Link>
        </Button>

        <section className="glass-card space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="page-header">
                <h1 className="page-title">{company.company_name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{company.industry || "Industry not set"}</span>
                  <span>|</span>
                  <a href={company.website || undefined} target="_blank" rel="noreferrer" className="transition-colors hover:text-primary">
                    {company.website || "Website not set"}
                  </a>
                  <span>|</span>
                  <span>{[company.city, company.country].filter(Boolean).join(", ") || "Location not set"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Account Owner: {company.account_owner || "Unassigned"}</span>
                  <span>|</span>
                  <span>Status:</span>
                  <Badge variant="outline" className={getCompanyStatusClassName(company.status)}>
                    {company.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
                  <UserRound className="h-4 w-4 text-info" />
                  {leads.length} leads
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
                  <UserRound className="h-4 w-4 text-primary" />
                  {contacts.length} contacts
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
                  <CalendarClock className="h-4 w-4 text-info" />
                  {activities.length} activities
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {documents.length} documents
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Created Date</p>
                <p className="mt-2 text-sm text-foreground">{formatCompanyDate(company.created_at)}</p>
              </div>
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Last Updated</p>
                <p className="mt-2 text-sm text-foreground">{formatCompanyDate(company.updated_at)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="glass-card p-6">
            <div className="mb-6">
              <h2 className="section-title">Overview</h2>
              <p className="section-subtitle">Core company profile and account ownership details.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailField label="Company Name" value={company.company_name} />
              <DetailField label="Industry" value={company.industry} />
              <DetailField label="Website" value={company.website} />
              <DetailField label="City" value={company.city} />
              <DetailField label="Country" value={company.country} />
              <DetailField label="Primary Contact" value={company.primary_contact} />
              <DetailField label="Phone" value={company.phone} />
              <DetailField label="Email" value={company.email} />
              <DetailField label="Account Owner" value={company.account_owner} />
              <DetailField label="Customer Status" value={company.status} />
              <DetailField label="Created Date" value={formatCompanyDate(company.created_at)} />
              <DetailField label="Last Updated" value={formatCompanyDate(company.updated_at)} />
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Notes</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{company.notes || "No notes captured yet."}</p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="contacts">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Contacts</h2>
                <p className="section-subtitle">All people linked to this account through company_id.</p>
              </div>
              <Button type="button" onClick={() => setIsAddContactOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </div>

            {contacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Decision Maker</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                      <TableCell>{contact.job_title || "—"}</TableCell>
                      <TableCell>{contact.department || "—"}</TableCell>
                      <TableCell>{contact.email || "—"}</TableCell>
                      <TableCell>{contact.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={contact.decision_maker ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-border/80 bg-secondary/50 text-muted-foreground"}>
                          {contact.decision_maker ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCompanyDate(contact.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No contacts yet" description="Add the first contact linked to this company." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="leads">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Linked Leads</h2>
              <p className="section-subtitle">Pipeline leads associated with this company account.</p>
            </div>

            {leads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Deal Value</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium text-foreground">{lead.company_name}</TableCell>
                      <TableCell>{lead.contact_name}</TableCell>
                      <TableCell>{lead.status}</TableCell>
                      <TableCell>{lead.lead_source}</TableCell>
                      <TableCell>{formatINR(lead.deal_value)}</TableCell>
                      <TableCell>{lead.probability}%</TableCell>
                      <TableCell>{lead.owner}</TableCell>
                      <TableCell>{formatCompanyDateTime(lead.last_activity_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No linked leads" description="There are no pipeline leads linked to this company yet." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="opportunities">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Opportunities</h2>
              <p className="section-subtitle">Revenue records linked to this account through company_id.</p>
            </div>

            {opportunities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity Name</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Deal Value</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Expected Close Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell className="font-medium text-foreground">{opportunity.opportunity_name}</TableCell>
                      <TableCell>{opportunity.stage}</TableCell>
                      <TableCell>{formatINR(opportunity.deal_value)}</TableCell>
                      <TableCell>{opportunity.probability}%</TableCell>
                      <TableCell>{formatCompanyDate(opportunity.expected_close_date)}</TableCell>
                      <TableCell>{opportunity.owner}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            opportunity.status === "Won"
                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                              : opportunity.status === "Lost"
                                ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                                : "border-info/25 bg-info/10 text-info"
                          }
                        >
                          {opportunity.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No opportunities linked" description="This account does not have any related opportunities yet." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="activities">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Activities Timeline</h2>
                <p className="section-subtitle">Chronological activity history sorted by activity_date DESC.</p>
              </div>
              <Button type="button" onClick={() => setIsLogActivityOpen(true)}>
                <Plus className="h-4 w-4" />
                Log Activity
              </Button>
            </div>

            <div className="glass-card p-6">
              {activities.length > 0 ? (
                <div className="relative space-y-4">
                  <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border/80" />
                  {activities.map((activity) => (
                    <article key={activity.id} className="relative pl-10">
                      <div className="absolute left-0 top-2 h-6 w-6 rounded-full border border-primary/30 bg-primary/15 shadow-[0_0_12px_rgba(99,102,241,0.18)]" />
                      <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{formatCompanyDateTime(activity.activity_date)}</p>
                            <p className="mt-2 text-sm leading-relaxed text-foreground">{activity.description}</p>
                          </div>
                          <Badge variant="outline" className={getActivityTypeClassName(activity.activity_type)}>
                            {activity.activity_type}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">Owner: {activity.owner}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No activities logged" description="Log calls, emails, meetings, notes, demos, or follow-ups for this company." />
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="interactions">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Interaction Timeline</h2>
              <p className="section-subtitle">
                Calls, meetings, emails, notes, and WhatsApp follow-ups captured against this account.
              </p>
            </div>

            <InteractionTimeline entityType="company" entityId={company.id} />
          </section>
        </TabsContent>

        <TabsContent value="documents">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Documents</h2>
                <p className="section-subtitle">Files attached to this company using company_id linkage.</p>
              </div>
              <Button type="button" onClick={() => setIsUploadDocumentOpen(true)}>
                <Plus className="h-4 w-4" />
                Upload Document
              </Button>
            </div>

            {documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium text-foreground">{document.file_name}</TableCell>
                      <TableCell>{document.uploaded_by}</TableCell>
                      <TableCell>{formatCompanyDate(document.created_at)}</TableCell>
                      <TableCell>
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary transition-colors hover:text-primary/80"
                        >
                          Open File
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No documents attached" description="Upload proposals, contracts, technical documents, NDAs, or purchase orders." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="ai-insights">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">AI Insights</h2>
              <p className="section-subtitle">AI-enabled account guidance for commercial progression and engagement planning.</p>
            </div>

            {ai_insight ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="glass-card p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[14px] border border-info/20 bg-info/10 p-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Win Probability</p>
                      <p className="mt-3 text-3xl font-semibold text-foreground">{ai_insight.win_probability}%</p>
                    </div>
                    <div className="rounded-[14px] border border-border/70 bg-secondary/30 p-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Deal Risk Score</p>
                      <p className={`mt-3 text-3xl font-semibold ${getRiskClassName(ai_insight.deal_risk_score)}`}>
                        {ai_insight.deal_risk_score}
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-border/70 bg-secondary/30 p-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Engagement Level</p>
                      <p className={`mt-3 text-2xl font-semibold ${getEngagementClassName(ai_insight.engagement_level)}`}>
                        {ai_insight.engagement_level}
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-primary/20 bg-primary/10 p-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Last Insight Refresh</p>
                      <p className="mt-3 text-sm text-foreground">{formatCompanyDate(ai_insight.updated_at)}</p>
                    </div>
                  </div>
                </div>

                <aside className="glass-card space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <h3 className="section-title">Recommended Next Action</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{ai_insight.recommended_next_action}</p>
                  <div className="rounded-[14px] border border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground">
                    Insight model output can be connected to a backend analytics service later without changing this UI structure.
                  </div>
                </aside>
              </div>
            ) : (
              <EmptyState title="No AI insight available" description="AI scoring can be connected later through the analytics service." />
            )}
          </section>
        </TabsContent>
      </Tabs>

      <AddContactModal
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        companyName={company.company_name}
        onSubmit={(input) => createCompanyContact(company.id, input)}
      />

      <LogActivityModal
        open={isLogActivityOpen}
        onOpenChange={setIsLogActivityOpen}
        companyName={company.company_name}
        accountOwners={account_owners}
        defaultOwner={company.account_owner}
        onSubmit={(input) => createCompanyActivity(company.id, input)}
      />

      <UploadDocumentModal
        open={isUploadDocumentOpen}
        onOpenChange={setIsUploadDocumentOpen}
        companyName={company.company_name}
        defaultUploader={company.account_owner}
        onSubmit={(input) => createCompanyDocument(company.id, input)}
      />
    </div>
  );
};

export default CompanyDetailPage;
