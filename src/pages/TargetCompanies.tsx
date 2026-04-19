import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ExternalLink, Building2, Users, Briefcase, Star, Pencil, Trash2, Archive, Globe, AlertTriangle, GitMerge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import CompanyAvatar from "@/components/CompanyAvatar";
import HelpHint from "@/components/help/HelpHint";
import DuplicateCompaniesDialog from "@/components/targetcompanies/DuplicateCompaniesDialog";
import { detectDuplicateClusters } from "@/components/targetcompanies/duplicateDetection";
import CoverageBadge from "@/components/targetcompanies/CoverageBadge";
import SourcingPanel from "@/components/targetcompanies/SourcingPanel";
import { getCoverageInfo, coverageGapComparator, COVERAGE_LABELS, type CoverageState, type CoverageInfo } from "@/components/targetcompanies/coverageUtils";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { TargetCompany, TargetCompanyPriority, TargetCompanyStatus, Job, Contact, NetworkRole } from "@/types/jobTracker";

interface TargetCompaniesProps {
  targetCompanies: TargetCompany[];
  jobs: Job[];
  contacts: Contact[];
  onAdd: (company: Omit<TargetCompany, "id" | "createdAt">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<TargetCompany>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMerge: (
    primaryId: string,
    duplicateIds: string[],
    mergedFields: Partial<TargetCompany>,
    duplicateNames: string[],
  ) => Promise<void>;
}

const priorityConfig: Record<TargetCompanyPriority, { label: string; color: string }> = {
  dream: { label: "Dream", color: "bg-amber-100 text-amber-800 border-amber-300" },
  strong: { label: "Strong", color: "bg-blue-100 text-blue-800 border-blue-300" },
  interested: { label: "Interested", color: "bg-muted text-muted-foreground border-border" },
};

const statusConfig: Record<TargetCompanyStatus, { label: string; color: string }> = {
  researching: { label: "Researching", color: "bg-purple-100 text-purple-800" },
  applied: { label: "Applied", color: "bg-green-100 text-green-800" },
  connected: { label: "Connected", color: "bg-blue-100 text-blue-800" },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground" },
};

const emptyForm = {
  name: "", website: "", careersUrl: "", industry: "", size: "",
  priority: "interested" as TargetCompanyPriority, status: "researching" as TargetCompanyStatus, notes: "",
};

export default function TargetCompanies({ targetCompanies, jobs, contacts, onAdd, onUpdate, onDelete, onMerge }: TargetCompaniesProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCoverage, setFilterCoverage] = useState<string>("all");
  const [sortMode, setSortMode] = useState<string>("default");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sourcingCompanyId, setSourcingCompanyId] = useState<string | null>(null);

  const duplicateClusters = useMemo(() => detectDuplicateClusters(targetCompanies), [targetCompanies]);

  // Compute coverage for every target once per render
  const withCoverage = useMemo(
    () => targetCompanies.map(company => ({ company, coverage: getCoverageInfo(company, contacts) })),
    [targetCompanies, contacts],
  );

  const coverageCounts = useMemo(() => {
    const counts: Record<CoverageState, number> = { booster: 0, connector: 0, recruiter: 0, cold: 0 };
    for (const { company, coverage } of withCoverage) {
      if (company.status === "archived") continue;
      counts[coverage.state] += 1;
    }
    return counts;
  }, [withCoverage]);
  const activeCount = withCoverage.filter(({ company }) => company.status !== "archived").length;

  const filtered = useMemo(() => {
    const list = withCoverage.filter(({ company, coverage }) => {
      if (filterPriority !== "all" && company.priority !== filterPriority) return false;
      if (filterStatus !== "all" && company.status !== filterStatus) return false;
      if (filterCoverage !== "all" && coverage.state !== filterCoverage) return false;
      if (search && !company.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortMode === "coverage_gap") {
      return [...list].sort(coverageGapComparator);
    }
    return list;
  }, [withCoverage, search, filterPriority, filterStatus, filterCoverage, sortMode]);

  const sourcingTarget = sourcingCompanyId
    ? withCoverage.find(({ company }) => company.id === sourcingCompanyId) || null
    : null;

  const activeStatuses = ["applied", "screening", "interviewing", "offer"];

  const getStats = (companyName: string) => {
    const matchedJobs = jobs.filter(j => companiesMatch(j.company, companyName));
    const matchedContacts = contacts.filter(c => companiesMatch(c.company, companyName));
    const activeApps = matchedJobs.filter(j => activeStatuses.includes(j.status));
    return { jobCount: matchedJobs.length, contactCount: matchedContacts.length, activeApps: activeApps.length };
  };

  const handleAddContactFromPanel = (prefill: { company: string; networkRole: NetworkRole }) => {
    // Hand off to Contacts page with prefill in URL params (existing pattern uses ?company=)
    navigate(`/contacts?company=${encodeURIComponent(prefill.company)}&role=${prefill.networkRole}&action=add`);
  };

  const handleMerge = async (
    primaryId: string,
    duplicateIds: string[],
    mergedFields: Partial<TargetCompany>,
    duplicateNames: string[],
  ) => {
    await onMerge(primaryId, duplicateIds, mergedFields, duplicateNames);
    toast.success(`Merged ${duplicateIds.length + 1} companies into "${mergedFields.name}"`);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
  const openEdit = (tc: TargetCompany) => {
    setForm({
      name: tc.name, website: tc.website || "", careersUrl: tc.careersUrl || "",
      industry: tc.industry || "", size: tc.size || "", priority: tc.priority,
      status: tc.status, notes: tc.notes || "",
    });
    setEditingId(tc.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await onUpdate(editingId, form);
    } else {
      await onAdd(form);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6" data-tour="page-target-companies">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            Target Companies
            <HelpHint articleId="target-companies" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build your dream employer shortlist and track your pipeline per company.</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Duplicate detection banner */}
      {duplicateClusters.length > 0 && !bannerDismissed && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            {duplicateClusters.length} potential duplicate group{duplicateClusters.length === 1 ? "" : "s"} detected
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300/90 flex items-center justify-between gap-3 flex-wrap mt-1">
            <span className="text-sm">
              {duplicateClusters.reduce((sum, c) => sum + c.length, 0)} target companies look like duplicates. Review and merge to keep your pipeline clean.
            </span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setBannerDismissed(true)}>Dismiss</Button>
              <Button size="sm" onClick={() => setDuplicatesDialogOpen(true)} className="gap-1.5">
                <GitMerge className="h-3.5 w-3.5" /> Review duplicates
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Coverage summary bar */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            {activeCount} active target{activeCount === 1 ? "" : "s"}:
          </span>
          {(["booster", "connector", "recruiter", "cold"] as CoverageState[]).map(state => {
            const count = coverageCounts[state];
            const conf = COVERAGE_LABELS[state];
            const isActive = filterCoverage === state;
            return (
              <button
                key={state}
                onClick={() => setFilterCoverage(isActive ? "all" : state)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted text-foreground border-border"
                }`}
              >
                <span aria-hidden>{conf.emoji}</span>
                <span>{count} {conf.short}</span>
              </button>
            );
          })}
          {filterCoverage !== "all" && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto" onClick={() => setFilterCoverage("all")}>
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="dream">Dream</SelectItem>
            <SelectItem value="strong">Strong</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCoverage} onValueChange={setFilterCoverage}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Coverage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coverage</SelectItem>
            <SelectItem value="booster">🚀 Has Booster</SelectItem>
            <SelectItem value="connector">🌉 Connector</SelectItem>
            <SelectItem value="recruiter">👀 Recruiter only</SelectItem>
            <SelectItem value="cold">❄️ Cold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortMode} onValueChange={setSortMode}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default order</SelectItem>
            <SelectItem value="coverage_gap">Coverage gap (cold first)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No target companies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start by adding the organizations you'd love to work at.</p>
            <Button onClick={openAdd} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ company: tc, coverage }) => {
            const stats = getStats(tc.name);
            const pConf = priorityConfig[tc.priority];
            const sConf = statusConfig[tc.status];
            return (
              <Card key={tc.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyAvatar company={tc.name} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{tc.name}</h3>
                        {tc.industry && <p className="text-xs text-muted-foreground truncate">{tc.industry}{tc.size ? ` · ${tc.size}` : ""}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs ${pConf.color}`}>{pConf.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <CoverageBadge coverage={coverage} onClick={() => setSourcingCompanyId(tc.id)} />
                    <Badge variant="secondary" className={`text-xs ${sConf.color}`}>{sConf.label}</Badge>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => navigate(`/jobs?company=${encodeURIComponent(tc.name)}`)} className="flex items-center gap-1 hover:text-foreground transition-colors"><Briefcase className="h-3.5 w-3.5" />{stats.jobCount} jobs</button>
                      </TooltipTrigger>
                      <TooltipContent>View all jobs at {tc.name}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => navigate(`/contacts?company=${encodeURIComponent(tc.name)}`)} className="flex items-center gap-1 hover:text-foreground transition-colors"><Users className="h-3.5 w-3.5" />{stats.contactCount} contacts</button>
                      </TooltipTrigger>
                      <TooltipContent>View contacts at {tc.name}</TooltipContent>
                    </Tooltip>
                    {stats.activeApps > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => navigate(`/jobs?company=${encodeURIComponent(tc.name)}&status=applied,screening,interviewing,offer`)} className="flex items-center gap-1 text-green-600 font-medium hover:text-green-700 transition-colors">{stats.activeApps} active</button>
                        </TooltipTrigger>
                        <TooltipContent>View jobs with active applications (applied, screening, interviewing, offer)</TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {tc.notes && <p className="text-xs text-muted-foreground line-clamp-2">{tc.notes}</p>}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant={coverage.state === "cold" ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1.5"
                      onClick={() => setSourcingCompanyId(tc.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {coverage.state === "booster" ? "Outreach" : coverage.state === "cold" ? "Find a Booster" : "Sourcing"}
                    </Button>
                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tc)}><Pencil className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                      {tc.careersUrl && (
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={tc.careersUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-3.5 w-3.5" /></a>
                          </Button>
                        </TooltipTrigger><TooltipContent>Careers page</TooltipContent></Tooltip>
                      )}
                      {tc.website && (
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={tc.website} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                        </TooltipTrigger><TooltipContent>Website</TooltipContent></Tooltip>
                      )}
                      {tc.status !== "archived" ? (
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdate(tc.id, { status: "archived" })}><Archive className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Archive</TooltipContent></Tooltip>
                      ) : (
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(tc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Target Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Stripe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TargetCompanyPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dream">🌟 Dream</SelectItem>
                    <SelectItem value="strong">💪 Strong</SelectItem>
                    <SelectItem value="interested">👀 Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TargetCompanyStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researching">Researching</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Careers URL</Label>
                <Input value={form.careersUrl} onChange={e => setForm(f => ({ ...f, careersUrl: e.target.value }))} placeholder="https://...careers" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Fintech" />
              </div>
              <div>
                <Label>Company Size</Label>
                <Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="e.g. 1000-5000" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Research notes, why this company..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editingId ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate companies dialog */}
      <DuplicateCompaniesDialog
        open={duplicatesDialogOpen}
        onOpenChange={setDuplicatesDialogOpen}
        clusters={duplicateClusters}
        jobs={jobs}
        contacts={contacts}
        onMerge={handleMerge}
      />
    </div>
  );
}

