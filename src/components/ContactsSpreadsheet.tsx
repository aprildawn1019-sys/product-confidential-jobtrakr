import { useMemo, useState, useCallback, useEffect } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Trash2, Megaphone, ChevronDown, Building2, Briefcase, CalendarDays, X } from "lucide-react";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Contact, Campaign, ContactCampaign, TargetCompany } from "@/types/jobTracker";

type SortKey =
  | "name"
  | "company"
  | "role"
  | "email"
  | "phone"
  | "warmth"
  | "followUp"
  | "campaigns"
  | "target";
type SortDir = "asc" | "desc";

const WARMTH_OPTIONS = ["none", "cold", "warm", "hot", "strong"] as const;

interface ContactsSpreadsheetProps {
  contacts: Contact[];
  campaigns: Campaign[];
  contactCampaigns: ContactCampaign[];
  targetCompanies: TargetCompany[];
  getTargetCompanyMatch: (companyName: string) => TargetCompany | undefined;
  getCampaignsForContact: (contactId: string) => Campaign[];
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  onToggleContactCampaign: (contactId: string, campaignId: string) => void;
}

interface EditableCellProps {
  value: string;
  onCommit: (next: string) => void;
  type?: "text" | "email" | "tel" | "url" | "date";
  placeholder?: string;
  className?: string;
}

function EditableCell({ value, onCommit, type = "text", placeholder, className }: EditableCellProps) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    if ((draft ?? "") !== (value ?? "")) onCommit(draft ?? "");
  };

  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(value ?? "");
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-8 border-transparent bg-transparent px-2 text-xs shadow-none focus-visible:border-input focus-visible:bg-background",
        className,
      )}
    />
  );
}

interface CampaignCellProps {
  contactId: string;
  selected: Campaign[];
  campaigns: Campaign[];
  onToggle: (contactId: string, campaignId: string) => void;
}

function CampaignCell({ contactId, selected, campaigns, onToggle }: CampaignCellProps) {
  if (campaigns.length === 0) {
    return <span className="px-2 text-xs text-muted-foreground">—</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center gap-1 rounded px-2 text-left text-xs hover:bg-muted/50"
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Add…</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1 overflow-hidden">
              {selected.slice(0, 2).map((c) => (
                <Badge key={c.id} variant="secondary" className="gap-1 text-[10px]">
                  <Megaphone className="h-2.5 w-2.5" />
                  {c.name}
                </Badge>
              ))}
              {selected.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{selected.length - 2}</span>
              )}
            </div>
          )}
          <ChevronDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">Campaigns</p>
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {campaigns.map((c) => {
            const isOn = selected.some((s) => s.id === c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox checked={isOn} onCheckedChange={() => onToggle(contactId, c.id)} />
                <span className="truncate">{c.name}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ContactsSpreadsheet({
  contacts,
  campaigns,
  contactCampaigns,
  getTargetCompanyMatch,
  getCampaignsForContact,
  onUpdate,
  onDelete,
  onToggleContactCampaign,
}: ContactsSpreadsheetProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkWarmth, setBulkWarmth] = useState<string>("");
  const [bulkAddCampaign, setBulkAddCampaign] = useState<string>("");
  const [bulkRemoveCampaign, setBulkRemoveCampaign] = useState<string>("");
  const [bulkCompany, setBulkCompany] = useState<string>("");
  const [bulkRole, setBulkRole] = useState<string>("");
  const [bulkFollowUp, setBulkFollowUp] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    const valueFor = (c: Contact, key: SortKey): string => {
      switch (key) {
        case "name":
          return c.name?.toLowerCase() ?? "";
        case "company":
          return c.company?.toLowerCase() ?? "";
        case "role":
          return c.role?.toLowerCase() ?? "";
        case "email":
          return (c.email || "").toLowerCase();
        case "phone":
          return c.phone || "";
        case "warmth":
          return c.relationshipWarmth || "";
        case "followUp":
          return c.followUpDate || "";
        case "campaigns":
          return getCampaignsForContact(c.id)
            .map((x) => x.name.toLowerCase())
            .sort()
            .join(",");
        case "target":
          return getTargetCompanyMatch(c.company) ? "1" : "0";
      }
    };
    const arr = [...contacts];
    arr.sort((a, b) => {
      const av = valueFor(a, sortKey);
      const bv = valueFor(b, sortKey);
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [contacts, sortKey, sortDir, getCampaignsForContact, getTargetCompanyMatch]);

  const allSelected = sorted.length > 0 && sorted.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(sorted.map((c) => c.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulkWarmth = () => {
    if (!bulkWarmth) return;
    const warmth = bulkWarmth === "none" ? undefined : bulkWarmth;
    selected.forEach((id) => onUpdate(id, { relationshipWarmth: warmth }));
    setBulkWarmth("");
  };

  const applyBulkAddCampaign = () => {
    if (!bulkAddCampaign) return;
    selected.forEach((contactId) => {
      const has = contactCampaigns.some(
        (cc) => cc.contactId === contactId && cc.campaignId === bulkAddCampaign,
      );
      if (!has) onToggleContactCampaign(contactId, bulkAddCampaign);
    });
    setBulkAddCampaign("");
  };

  const applyBulkRemoveCampaign = () => {
    if (!bulkRemoveCampaign) return;
    selected.forEach((contactId) => {
      const has = contactCampaigns.some(
        (cc) => cc.contactId === contactId && cc.campaignId === bulkRemoveCampaign,
      );
      if (has) onToggleContactCampaign(contactId, bulkRemoveCampaign);
    });
    setBulkRemoveCampaign("");
  };

  const applyBulkCompany = () => {
    const next = bulkCompany.trim();
    if (!next) return;
    selected.forEach((id) => onUpdate(id, { company: next }));
    setBulkCompany("");
  };

  const applyBulkRole = () => {
    const next = bulkRole.trim();
    if (!next) return;
    selected.forEach((id) => onUpdate(id, { role: next }));
    setBulkRole("");
  };

  const applyBulkFollowUp = () => {
    if (!bulkFollowUp) return;
    selected.forEach((id) => onUpdate(id, { followUpDate: bulkFollowUp }));
    setBulkFollowUp("");
  };

  const applyBulkClearFollowUp = () => {
    selected.forEach((id) => onUpdate(id, { followUpDate: undefined }));
  };

  const applyBulkDelete = () => {
    selected.forEach((id) => onDelete(id));
    setSelected(new Set());
    setConfirmDelete(false);
  };

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "flex h-full w-full items-center gap-1 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-1">
            <Select value={bulkWarmth} onValueChange={setBulkWarmth}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue placeholder="Set warmth…" />
              </SelectTrigger>
              <SelectContent>
                {WARMTH_OPTIONS.map((w) => (
                  <SelectItem key={w} value={w} className="capitalize text-xs">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkWarmth} disabled={!bulkWarmth}>
              Apply
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={bulkCompany}
                onChange={(e) => setBulkCompany(e.target.value)}
                placeholder="Set company…"
                className="h-7 w-[150px] pl-7 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") applyBulkCompany(); }}
              />
            </div>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkCompany} disabled={!bulkCompany.trim()}>
              Apply
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <Briefcase className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                placeholder="Set role…"
                className="h-7 w-[150px] pl-7 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") applyBulkRole(); }}
              />
            </div>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkRole} disabled={!bulkRole.trim()}>
              Apply
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={bulkFollowUp}
                onChange={(e) => setBulkFollowUp(e.target.value)}
                className="h-7 w-[150px] pl-7 text-xs"
                title="Set follow-up date"
              />
            </div>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkFollowUp} disabled={!bulkFollowUp}>
              Set
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={applyBulkClearFollowUp} title="Clear follow-up date for selected">
              <X className="h-3 w-3" />
            </Button>
          </div>
          {campaigns.length > 0 && (
            <>
              <div className="flex items-center gap-1">
                <Select value={bulkAddCampaign} onValueChange={setBulkAddCampaign}>
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue placeholder="Add to campaign…" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkAddCampaign} disabled={!bulkAddCampaign}>
                  Add
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Select value={bulkRemoveCampaign} onValueChange={setBulkRemoveCampaign}>
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue placeholder="Remove from campaign…" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={applyBulkRemoveCampaign} disabled={!bulkRemoveCampaign}>
                  Remove
                </Button>
              </div>
            </>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto h-7 gap-1 text-xs"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1200px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
            <tr className="border-b border-border">
              <th className="w-9 px-2">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAll(!!v)}
                  aria-label="Select all"
                />
              </th>
              <th className="min-w-[160px]"><SortHeader k="name" label="Name" /></th>
              <th className="min-w-[160px]"><SortHeader k="company" label="Company" /></th>
              <th className="min-w-[90px]"><SortHeader k="target" label="Target" /></th>
              <th className="min-w-[160px]"><SortHeader k="role" label="Role" /></th>
              <th className="min-w-[180px]"><SortHeader k="email" label="Email" /></th>
              <th className="min-w-[130px]"><SortHeader k="phone" label="Phone" /></th>
              <th className="min-w-[180px]">
                <span className="block px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  LinkedIn
                </span>
              </th>
              <th className="min-w-[120px]"><SortHeader k="warmth" label="Warmth" /></th>
              <th className="min-w-[140px]"><SortHeader k="followUp" label="Follow-up" /></th>
              <th className="min-w-[200px]"><SortHeader k="campaigns" label="Campaigns" /></th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No contacts to display.
                </td>
              </tr>
            )}
            {sorted.map((c) => {
              const isSel = selected.has(c.id);
              const target = getTargetCompanyMatch(c.company);
              const contactCmpgns = getCampaignsForContact(c.id);
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b border-border/60 transition-colors",
                    isSel ? "bg-primary/5" : "hover:bg-muted/30",
                  )}
                >
                  <td className="px-2 align-middle">
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={(v) => toggleOne(c.id, !!v)}
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.name}
                      onCommit={(v) => onUpdate(c.id, { name: v })}
                      placeholder="Name"
                      className="font-medium"
                    />
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.company}
                      onCommit={(v) => onUpdate(c.id, { company: v })}
                      placeholder="Company"
                    />
                  </td>
                  <td className="px-2 align-middle">
                    {target ? (
                      <TargetCompanyBadge target={target} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.role || ""}
                      onCommit={(v) => onUpdate(c.id, { role: v })}
                      placeholder="Role"
                    />
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.email || ""}
                      onCommit={(v) => onUpdate(c.id, { email: v || undefined })}
                      type="email"
                      placeholder="email@…"
                    />
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.phone || ""}
                      onCommit={(v) => onUpdate(c.id, { phone: v || undefined })}
                      type="tel"
                      placeholder="—"
                    />
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.linkedin || ""}
                      onCommit={(v) => onUpdate(c.id, { linkedin: v || undefined })}
                      placeholder="linkedin.com/in/…"
                    />
                  </td>
                  <td className="px-2 align-middle">
                    <Select
                      value={c.relationshipWarmth || "none"}
                      onValueChange={(v) =>
                        onUpdate(c.id, { relationshipWarmth: v === "none" ? undefined : v })
                      }
                    >
                      <SelectTrigger className="h-8 border-transparent bg-transparent text-xs capitalize shadow-none hover:border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WARMTH_OPTIONS.map((w) => (
                          <SelectItem key={w} value={w} className="capitalize text-xs">
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="align-middle">
                    <EditableCell
                      value={c.followUpDate || ""}
                      onCommit={(v) => onUpdate(c.id, { followUpDate: v || undefined })}
                      type="date"
                    />
                  </td>
                  <td className="px-1 align-middle">
                    <CampaignCell
                      contactId={c.id}
                      selected={contactCmpgns}
                      campaigns={campaigns}
                      onToggle={onToggleContactCampaign}
                    />
                  </td>
                  <td className="px-1 text-right align-middle">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDelete(c.id)}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} contact{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected contacts and unlinks them from any jobs and campaigns. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
