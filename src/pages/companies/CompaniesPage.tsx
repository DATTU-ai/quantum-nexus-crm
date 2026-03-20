import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import AddCompanyModal from "@/components/companies/AddCompanyModal";
import { formatCompanyDate, getCompanyStatusClassName } from "@/components/companies/companyTheme";
import { useCompaniesData } from "@/components/companies/CompaniesProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const rowsPerPage = 8;

const CompaniesPage = () => {
  const { account_owners, companies, contacts, createCompany } = useCompaniesData();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

  const contactIndex = useMemo(() => {
    return contacts.reduce<Record<string, string>>((accumulator, contact) => {
      const currentValue = accumulator[contact.company_id] ?? "";
      accumulator[contact.company_id] = `${currentValue} ${contact.name} ${contact.email} ${contact.phone}`.trim();
      return accumulator;
    }, {});
  }, [contacts]);

  const filteredCompanies = useMemo(() => {
    const records = companies.filter((company) => {
      const searchableText = [
        company.company_name,
        company.primary_contact,
        company.industry,
        company.city,
        company.email,
        contactIndex[company.id] ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return !deferredSearch || searchableText.includes(deferredSearch);
    });

    return [...records].sort((left, right) => right.created_at.localeCompare(left.created_at));
  }, [companies, contactIndex, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / rowsPerPage));

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedCompanies = filteredCompanies.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="relative max-w-[1600px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-20 left-0 h-60 w-60 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-10 top-20 h-64 w-64 rounded-full bg-info/10 blur-3xl" />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="page-header">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-primary">
            <Building2 className="h-3.5 w-3.5" />
            DATTU AI - Quantum CRM
          </p>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">Global CRM account log with searchable company records and linked account detail views.</p>
        </div>

        <Button type="button" className="rounded-xl" onClick={() => setIsAddCompanyOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </header>

      <section className="glass-card space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search companies, contacts, or industry"
              className="h-10 rounded-xl border-border/80 bg-card/85 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-info/20 bg-info/10 px-4 py-2 text-sm text-muted-foreground">
              {filteredCompanies.length} companies found
            </div>
            <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Account Owner</TableHead>
              <TableHead>Created Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="min-w-[220px]">
                  <Link
                    to={`/companies/${company.id}`}
                    className="font-medium text-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {company.company_name}
                  </Link>
                </TableCell>
                <TableCell>{company.industry || "—"}</TableCell>
                <TableCell>{company.city || "—"}</TableCell>
                <TableCell>{company.primary_contact || "—"}</TableCell>
                <TableCell>{company.phone || "—"}</TableCell>
                <TableCell>{company.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getCompanyStatusClassName(company.status)}>
                    {company.status}
                  </Badge>
                </TableCell>
                <TableCell>{company.account_owner || "—"}</TableCell>
                <TableCell>{formatCompanyDate(company.created_at)}</TableCell>
              </TableRow>
            ))}

            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No companies match the current search.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * rowsPerPage + (paginatedCompanies.length === 0 ? 0 : 1)}-
            {(page - 1) * rowsPerPage + paginatedCompanies.length} of {filteredCompanies.length}
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

      <AddCompanyModal
        open={isAddCompanyOpen}
        onOpenChange={setIsAddCompanyOpen}
        accountOwners={account_owners}
        onSubmit={(input) => {
          setPage(1);
          return createCompany(input);
        }}
      />
    </div>
  );
};

export default CompaniesPage;
