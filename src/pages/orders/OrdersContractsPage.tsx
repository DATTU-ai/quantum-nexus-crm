import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClipboardList, CreditCard, Plus, RefreshCw, Search, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCompaniesData } from "@/components/companies/CompaniesProvider";
import CreateWorkOrderModal from "@/components/orders/CreateWorkOrderModal";
import { formatOrderCurrency, formatOrderDate, getImplementationStatusClassName, getPaymentStatusClassName, isRenewalReminderDue } from "@/components/orders/orderTheme";
import { useOrdersData } from "@/components/orders/OrdersProvider";
import { usePipelineData } from "@/components/pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { implementation_statuses, order_payment_statuses, renewal_statuses, type ImplementationStatus, type OrderPaymentStatus, type RenewalStatus } from "@/types/order";

const rowsPerPage = 8;

type OrderFilters = {
  status: ImplementationStatus | "all";
  paymentStatus: OrderPaymentStatus | "all";
  renewalStatus: RenewalStatus | "all";
  accountManager: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: OrderFilters = {
  status: "all",
  paymentStatus: "all",
  renewalStatus: "all",
  accountManager: "all",
  dateFrom: "",
  dateTo: "",
};

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof ClipboardList;
}) => (
  <article className="glass-card min-h-[128px] p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_12px_rgba(99,102,241,0.18)]">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <p className="mt-4 text-sm text-muted-foreground">{description}</p>
  </article>
);

const OrdersContractsPage = () => {
  const { companies } = useCompaniesData();
  const { opportunityRecords } = usePipelineData();
  const { accountManagers, createWorkOrder, implementations, workOrders } = useOrdersData();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<OrderFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );

  const opportunityOptions = useMemo(
    () =>
      opportunityRecords
        .filter((record) => record.stage !== "Deal Lost")
        .map((record) => {
          const company = companies.find((item) => item.company_name === record.companyInfo.companyName);

          return {
            id: record.id,
            company_id: company?.id,
            company_name: record.companyInfo.companyName,
            label: `${record.companyInfo.companyName} - ${record.opportunityDetails.opportunityName ?? record.stage}`,
            product_service: record.opportunityDetails.productInterest,
            order_value: record.opportunityDetails.dealValue,
            owner: record.assignedSalesperson,
          };
        })
        .sort((left, right) => left.company_name.localeCompare(right.company_name)),
    [companies, opportunityRecords],
  );

  const implementationMap = useMemo(
    () => new Map(implementations.map((implementation) => [implementation.work_order_id, implementation])),
    [implementations],
  );

  const viewModels = useMemo(
    () =>
      workOrders.map((order) => {
        const company = companyMap.get(order.company_id);
        const opportunity = opportunityRecords.find((record) => record.id === order.opportunity_id) ?? null;
        const implementation = implementationMap.get(order.id) ?? null;

        return {
          order,
          company,
          opportunity,
          implementation,
        };
      }),
    [companyMap, implementationMap, opportunityRecords, workOrders],
  );

  const filteredOrders = useMemo(() => {
    return viewModels.filter(({ order, company, opportunity, implementation }) => {
      const searchableText = [
        order.order_id,
        company?.company_name ?? "",
        order.product_service,
        opportunity?.opportunityDetails.opportunityName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !deferredSearch || searchableText.includes(deferredSearch);
      const matchesStatus = filters.status === "all" || (implementation?.status ?? order.status) === filters.status;
      const matchesPayment = filters.paymentStatus === "all" || order.payment_status === filters.paymentStatus;
      const matchesRenewal = filters.renewalStatus === "all" || order.renewal_status === filters.renewalStatus;
      const matchesManager = filters.accountManager === "all" || order.account_manager === filters.accountManager;
      const matchesFrom = !filters.dateFrom || order.order_date >= filters.dateFrom;
      const matchesTo = !filters.dateTo || order.order_date <= filters.dateTo;

      return matchesSearch && matchesStatus && matchesPayment && matchesRenewal && matchesManager && matchesFrom && matchesTo;
    });
  }, [deferredSearch, filters, viewModels]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, filters]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedOrders = filteredOrders.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const summary = useMemo(() => {
    const totalOrders = workOrders.length;
    const activeImplementations = workOrders.filter((order) => {
      const implementationStatus = implementationMap.get(order.id)?.status ?? order.status;
      return !["Delivered", "Closed"].includes(implementationStatus);
    }).length;
    const pendingPayments = workOrders.filter((order) => ["Pending", "Partial", "Overdue"].includes(order.payment_status)).length;
    const upcomingRenewals = workOrders.filter((order) => isRenewalReminderDue(order.renewal_date) && !["Expired", "Cancelled"].includes(order.renewal_status)).length;

    return {
      totalOrders,
      activeImplementations,
      pendingPayments,
      upcomingRenewals,
    };
  }, [implementationMap, workOrders]);

  const setFilter = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="relative max-w-[1600px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-24 left-[-7%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-4 top-20 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:38px_38px]" />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="page-header">
          <h1 className="page-title">Orders & Contracts</h1>
          <p className="page-subtitle">Track project implementation, payments, invoices, contracts, and renewals from one post-sales control center.</p>
        </div>

        <Button type="button" className="rounded-xl" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Work Order
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Orders" value={summary.totalOrders.toString()} description="All active and historical work orders" icon={ClipboardList} />
        <MetricCard title="Active Implementations" value={summary.activeImplementations.toString()} description="Projects still moving through delivery" icon={Settings2} />
        <MetricCard title="Pending Payments" value={summary.pendingPayments.toString()} description="Orders still awaiting payment reconciliation" icon={CreditCard} />
        <MetricCard title="Upcoming Renewals" value={summary.upcomingRenewals.toString()} description="Renewals due in the next 30 days" icon={RefreshCw} />
      </section>

      <section className="glass-card space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search orders, companies, or order IDs"
              className="h-10 rounded-xl border-border/80 bg-card/85 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-info/20 bg-info/10 px-4 py-2 text-sm text-muted-foreground">
              {filteredOrders.length} orders match filters
            </div>
            <Button type="button" variant="outline" onClick={() => setFilters(defaultFilters)}>
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Select value={filters.status} onValueChange={(value) => setFilter("status", value as OrderFilters["status"])}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {implementation_statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.paymentStatus} onValueChange={(value) => setFilter("paymentStatus", value as OrderFilters["paymentStatus"])}>
            <SelectTrigger>
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment statuses</SelectItem>
              {order_payment_statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.renewalStatus} onValueChange={(value) => setFilter("renewalStatus", value as OrderFilters["renewalStatus"])}>
            <SelectTrigger>
              <SelectValue placeholder="Renewal Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All renewal statuses</SelectItem>
              {renewal_statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.accountManager} onValueChange={(value) => setFilter("accountManager", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Account Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All account managers</SelectItem>
              {accountManagers.map((manager) => (
                <SelectItem key={manager} value={manager}>
                  {manager}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={filters.dateFrom} onChange={(event) => setFilter("dateFrom", event.target.value)} />
            <Input type="date" value={filters.dateTo} onChange={(event) => setFilter("dateTo", event.target.value)} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Opportunity</TableHead>
              <TableHead>Product / Service</TableHead>
              <TableHead>Order Value</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Completion Date</TableHead>
              <TableHead>Implementation Status</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Renewal Date</TableHead>
              <TableHead>Account Manager</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map(({ order, company, opportunity, implementation }) => (
              <TableRow key={order.id}>
                <TableCell className="min-w-[120px]">
                  <Link to={`/orders/${order.order_id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                    {order.order_id}
                  </Link>
                </TableCell>
                <TableCell className="min-w-[180px]">
                  {company ? (
                    <Link to={`/companies/${company.id}`} className="transition-colors hover:text-primary">
                      {company.company_name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{opportunity?.opportunityDetails.opportunityName ?? opportunity?.stage ?? "-"}</TableCell>
                <TableCell>{order.product_service}</TableCell>
                <TableCell>{formatOrderCurrency(order.order_value, order.currency)}</TableCell>
                <TableCell>{formatOrderDate(order.start_date)}</TableCell>
                <TableCell>{formatOrderDate(order.completion_date)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getImplementationStatusClassName(implementation?.status ?? order.status)}>
                    {implementation?.status ?? order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPaymentStatusClassName(order.payment_status)}>
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>{formatOrderDate(order.renewal_date)}</p>
                    {isRenewalReminderDue(order.renewal_date) ? (
                      <p className="text-xs text-quantum-warning">Reminder due within 30 days</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{order.account_manager}</TableCell>
              </TableRow>
            ))}

            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  No orders match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * rowsPerPage + (paginatedOrders.length === 0 ? 0 : 1)}-
            {(page - 1) * rowsPerPage + paginatedOrders.length} of {filteredOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </section>

      <CreateWorkOrderModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        companies={companies}
        opportunities={opportunityOptions}
        accountManagers={[...new Set([...accountManagers, ...companies.map((company) => company.account_owner), ...opportunityOptions.map((option) => option.owner)])].sort((left, right) => left.localeCompare(right))}
        onSubmit={createWorkOrder}
      />
    </div>
  );
};

export default OrdersContractsPage;
