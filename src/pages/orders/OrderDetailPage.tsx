import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Landmark,
  Plus,
  Settings2,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useCompaniesData } from "@/components/companies/CompaniesProvider";
import AddRenewalModal from "@/components/orders/AddRenewalModal";
import InvoiceModal from "@/components/orders/InvoiceModal";
import { formatOrderCurrency, formatOrderDate, formatOrderDateTime, getActivityTypeClassName, getImplementationStatusClassName, getPaymentStatusClassName, getRenewalStatusClassName, isRenewalReminderDue } from "@/components/orders/orderTheme";
import { useOrdersData } from "@/components/orders/OrdersProvider";
import RecordPaymentModal from "@/components/orders/RecordPaymentModal";
import UploadOrderDocumentModal from "@/components/orders/UploadOrderDocumentModal";
import { usePipelineData } from "@/components/pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm leading-relaxed text-foreground">{value || "-"}</p>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[14px] border border-dashed border-border/80 bg-secondary/20 px-6 py-10 text-center">
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);

const milestoneBlueprint = [
  { title: "Project Kickoff", threshold: 10 },
  { title: "Requirement Analysis", threshold: 25 },
  { title: "System Setup", threshold: 45 },
  { title: "Testing", threshold: 70 },
  { title: "Delivery", threshold: 95 },
];

const OrderDetailPage = () => {
  const { orderId = "" } = useParams();
  const { companies } = useCompaniesData();
  const { opportunityRecords } = usePipelineData();
  const {
    createInvoice,
    createOrderDocument,
    createRenewal,
    getOrderDetail,
    recordPayment,
    workOrders,
  } = useOrdersData();
  const [invoiceMode, setInvoiceMode] = useState<"generate" | "upload" | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);

  const detail = useMemo(() => getOrderDetail(orderId), [getOrderDetail, orderId]);

  if (!detail && workOrders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-xl p-10 text-center">
          <p className="text-lg font-semibold text-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-xl p-10 text-center">
          <p className="text-lg font-semibold text-foreground">Order not found</p>
          <p className="mt-2 text-base text-muted-foreground">
            The requested work order does not exist in the current Orders & Contracts dataset.
          </p>
          <Button asChild className="mt-6">
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { work_order, implementation, invoices, payments, documents, renewals, activities } = detail;
  const company = companies.find((item) => item.id === work_order.company_id) ?? null;
  const opportunity = opportunityRecords.find((item) => item.id === work_order.opportunity_id) ?? null;
  const milestones = milestoneBlueprint.map((milestone) => ({
    ...milestone,
    completed: (implementation?.progress ?? 0) >= milestone.threshold,
  }));

  return (
    <div className="relative max-w-[1600px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-20 left-0 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4">
        <Button asChild variant="outline" className="w-fit rounded-xl">
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </Button>

        <section className="glass-card space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="page-header">
                <h1 className="page-title">{work_order.order_id}</h1>
                <p className="page-subtitle">
                  {company?.company_name ?? "Linked company missing"} - {work_order.product_service}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{opportunity?.opportunityDetails.opportunityName ?? opportunity?.stage ?? "No linked opportunity"}</span>
                  <span>|</span>
                  <span>Account Manager: {work_order.account_manager}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className={getImplementationStatusClassName(implementation?.status ?? work_order.status)}>
                  {implementation?.status ?? work_order.status}
                </Badge>
                <Badge variant="outline" className={getPaymentStatusClassName(work_order.payment_status)}>
                  {work_order.payment_status}
                </Badge>
                <Badge variant="outline" className={getRenewalStatusClassName(work_order.renewal_status)}>
                  {work_order.renewal_status}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Order Value</p>
                <p className="mt-2 text-sm text-foreground">{formatOrderCurrency(work_order.order_value, work_order.currency)}</p>
              </div>
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Renewal Date</p>
                <p className="mt-2 text-sm text-foreground">{formatOrderDate(work_order.renewal_date)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="glass-card p-6">
            <div className="mb-6">
              <h2 className="section-title">Overview</h2>
              <p className="section-subtitle">Core order details, linked account context, and financial status at a glance.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailField label="Order ID" value={work_order.order_id} />
              <DetailField label="Company" value={company?.company_name ?? "-"} />
              <DetailField label="Opportunity" value={opportunity?.opportunityDetails.opportunityName ?? opportunity?.stage ?? "-"} />
              <DetailField label="Product / Service" value={work_order.product_service} />
              <DetailField label="Order Value" value={formatOrderCurrency(work_order.order_value, work_order.currency)} />
              <DetailField label="Currency" value={work_order.currency} />
              <DetailField label="Order Date" value={formatOrderDate(work_order.order_date)} />
              <DetailField label="Start Date" value={formatOrderDate(work_order.start_date)} />
              <DetailField label="Completion Date" value={formatOrderDate(work_order.completion_date)} />
              <DetailField label="Account Manager" value={work_order.account_manager} />
              <DetailField label="Payment Due Date" value={formatOrderDate(work_order.payment_due_date)} />
              <DetailField label="Invoice Number" value={work_order.invoice_number || "Not assigned"} />
              <DetailField label="Advance Amount" value={formatOrderCurrency(work_order.advance_amount, work_order.currency)} />
              <DetailField label="Amount Paid" value={formatOrderCurrency(work_order.amount_paid, work_order.currency)} />
              <DetailField label="Balance Amount" value={formatOrderCurrency(work_order.balance_amount, work_order.currency)} />
              <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Notes</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{work_order.notes || "No notes recorded."}</p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="implementation">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Implementation</h2>
              <p className="section-subtitle">Project delivery ownership, execution mode, and milestone progress.</p>
            </div>

            {implementation ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="glass-card space-y-6 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Implementation Progress</p>
                      <p className="mt-1 text-sm text-muted-foreground">{implementation.progress}% complete</p>
                    </div>
                    <Badge variant="outline" className={getImplementationStatusClassName(implementation.status)}>
                      {implementation.status}
                    </Badge>
                  </div>
                  <Progress value={implementation.progress} className="h-3 bg-secondary/60" />

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label="Implementation Type" value={implementation.implementation_type} />
                    <DetailField label="Project Owner" value={implementation.project_owner} />
                    <DetailField label="Technical Lead" value={implementation.technical_lead} />
                    <DetailField label="Status" value={implementation.status} />
                  </div>
                </div>

                <aside className="glass-card p-6">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h3 className="section-title">Milestones</h3>
                  </div>
                  <div className="mt-5 space-y-3">
                    {milestones.map((milestone) => (
                      <div key={milestone.title} className="flex items-center justify-between gap-3 rounded-[14px] border border-border/70 bg-secondary/25 px-4 py-3">
                        <span className="text-sm text-foreground">{milestone.title}</span>
                        <Badge variant="outline" className={milestone.completed ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-border/80 bg-secondary/50 text-muted-foreground"}>
                          {milestone.completed ? "Done" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            ) : (
              <EmptyState title="No implementation data" description="This work order does not have implementation tracking yet." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="invoices">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Invoices</h2>
                <p className="section-subtitle">Create, upload, reconcile, and download invoice records linked to this order.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setInvoiceMode("generate")}>
                  <Plus className="h-4 w-4" />
                  Generate Invoice
                </Button>
                <Button type="button" variant="outline" onClick={() => setInvoiceMode("upload")}>
                  <FileText className="h-4 w-4" />
                  Upload Invoice
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(true)}>
                  <Landmark className="h-4 w-4" />
                  Record Payment
                </Button>
              </div>
            </div>

            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Download Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-foreground">{invoice.invoice_number}</TableCell>
                      <TableCell>{formatOrderCurrency(invoice.amount, work_order.currency)}</TableCell>
                      <TableCell>{formatOrderDate(invoice.invoice_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPaymentStatusClassName(invoice.payment_status)}>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a href={invoice.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No invoices yet" description="Generate or upload the first invoice for this work order." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="payments">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Payments</h2>
                <p className="section-subtitle">Track advances, received amounts, due balance, and invoice-linked payments.</p>
              </div>
              <Button type="button" onClick={() => setIsPaymentOpen(true)}>
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailField label="Total Order Value" value={formatOrderCurrency(work_order.order_value, work_order.currency)} />
              <DetailField label="Advance Amount" value={formatOrderCurrency(work_order.advance_amount, work_order.currency)} />
              <DetailField label="Amount Paid" value={formatOrderCurrency(work_order.amount_paid, work_order.currency)} />
              <DetailField label="Balance Amount" value={formatOrderCurrency(work_order.balance_amount, work_order.currency)} />
            </div>

            {payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const invoice = invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoice_id) ?? null;

                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{formatOrderDate(payment.payment_date)}</TableCell>
                        <TableCell>{formatOrderCurrency(payment.amount, work_order.currency)}</TableCell>
                        <TableCell>{invoice?.invoice_number ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPaymentStatusClassName(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.received_by}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No payments recorded" description="Record incoming payments to keep finance status current." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="documents">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Documents</h2>
                <p className="section-subtitle">Purchase orders, contracts, invoice copies, delivery certificates, and implementation files.</p>
              </div>
              <Button type="button" onClick={() => setIsDocumentOpen(true)}>
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
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium text-foreground">{document.file_name}</TableCell>
                      <TableCell>{document.uploaded_by}</TableCell>
                      <TableCell>{formatOrderDate(document.created_at)}</TableCell>
                      <TableCell>
                        <a href={document.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:text-primary/80">
                          Open File
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No documents attached" description="Upload the first order document to keep commercial and delivery artifacts together." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="renewals">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Renewals</h2>
                <p className="section-subtitle">Renewal and AMC schedules, values, durations, and 30-day reminder visibility.</p>
              </div>
              <Button type="button" onClick={() => setIsRenewalOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Renewal
              </Button>
            </div>

            {renewals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Renewal Type</TableHead>
                    <TableHead>Renewal Date</TableHead>
                    <TableHead>Renewal Value</TableHead>
                    <TableHead>Contract Duration</TableHead>
                    <TableHead>Auto Renewal</TableHead>
                    <TableHead>AMC Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((renewal) => (
                    <TableRow key={renewal.id}>
                      <TableCell className="font-medium text-foreground">{renewal.renewal_type}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{formatOrderDate(renewal.renewal_date)}</p>
                          {isRenewalReminderDue(renewal.renewal_date) ? (
                            <p className="text-xs text-quantum-warning">Notify within 30 days</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatOrderCurrency(renewal.renewal_value, work_order.currency)}</TableCell>
                      <TableCell>{renewal.contract_duration}</TableCell>
                      <TableCell>{renewal.auto_renewal ? "Enabled" : "Disabled"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRenewalStatusClassName(renewal.status)}>
                          {renewal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No renewal schedule" description="Create a renewal or AMC record to track post-contract continuity." />
            )}
          </section>
        </TabsContent>

        <TabsContent value="activity">
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Activity Timeline</h2>
              <p className="section-subtitle">Post-sales activity history sorted by latest event first.</p>
            </div>

            {activities.length > 0 ? (
              <div className="glass-card p-6">
                <div className="relative space-y-4">
                  <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border/80" />
                  {activities.map((activity) => (
                    <article key={activity.id} className="relative pl-10">
                      <div className="absolute left-0 top-2 h-6 w-6 rounded-full border border-primary/30 bg-primary/15 shadow-[0_0_12px_rgba(99,102,241,0.18)]" />
                      <div className="rounded-[14px] border border-border/70 bg-secondary/25 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{formatOrderDateTime(activity.activity_date)}</p>
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
              </div>
            ) : (
              <EmptyState title="No activity yet" description="Order creation, implementation updates, invoices, and payments will appear here." />
            )}
          </section>
        </TabsContent>
      </Tabs>

      {invoiceMode ? (
        <InvoiceModal
          open={invoiceMode !== null}
          onOpenChange={(open) => {
            if (!open) setInvoiceMode(null);
          }}
          mode={invoiceMode}
          orderId={work_order.order_id}
          defaultAmount={work_order.balance_amount > 0 ? work_order.balance_amount : work_order.order_value}
          onSubmit={(input) => createInvoice(work_order.id, input)}
        />
      ) : null}

      <RecordPaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        orderId={work_order.order_id}
        defaultReceiver={work_order.account_manager}
        invoices={invoices}
        onSubmit={(input) => recordPayment(work_order.id, input)}
      />

      <UploadOrderDocumentModal
        open={isDocumentOpen}
        onOpenChange={setIsDocumentOpen}
        orderId={work_order.order_id}
        defaultUploader={work_order.account_manager}
        onSubmit={(input) => createOrderDocument(work_order.id, input)}
      />

      <AddRenewalModal
        open={isRenewalOpen}
        onOpenChange={setIsRenewalOpen}
        orderId={work_order.order_id}
        onSubmit={(input) => createRenewal(work_order.id, input)}
      />
    </div>
  );
};

export default OrderDetailPage;
