import { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  X,
  FileText,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/types/jobTracker";

/**
 * ImportJobsWizard
 * ----------------
 * Multi-step onboarding wrapper around the same CSV/XLSX parser + AI column
 * mapper used by `BulkJobUploadDialog`. The wizard is intentionally a thin
 * presentation layer over the proven logic — it does not duplicate parsing
 * code beyond surface restructuring required to expose each step.
 *
 * Steps (5):
 *   1. Source     — pick file kind (CSV / XLSX). Sets accept attr + copy.
 *   2. Upload     — file picker + parse (reads workbook, detects headers).
 *   3. Map        — auto-mapped via static aliases + AI fallback; user can
 *                   override per Job field via dropdowns over detected
 *                   headers. Required: Company, Title.
 *   4. Preview    — toggle individual rows, deduplicate, see counts.
 *   5. Import     — commit selected rows via `onImport` and show success.
 *
 * Why a wizard (vs the existing single-dialog flow):
 * - Lower cognitive load on first run — one decision per step.
 * - Explicit confirmation before mutating the user's tracker.
 * - Mapping step now editable, which the original dialog did not expose.
 */

interface ImportJobsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bulk insert handler from the job tracker store. */
  onImport: (jobs: Omit<Job, "id" | "createdAt">[]) => void | Promise<void>;
  /** Existing jobs, used for duplicate detection (company+title key). */
  existingJobs: Job[];
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

type SourceKind = "csv" | "xlsx";

/** Canonical Job fields the wizard knows how to populate from columns. */
const JOB_FIELDS = [
  { key: "company", label: "Company", required: true },
  { key: "title", label: "Job title", required: true },
  { key: "location", label: "Location", required: false },
  { key: "type", label: "Work type", required: false },
  { key: "salary", label: "Salary", required: false },
  { key: "url", label: "Posting URL", required: false },
  { key: "status", label: "Status", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "description", label: "Description", required: false },
] as const;

type FieldKey = (typeof JOB_FIELDS)[number]["key"];

const STATIC_HEADER_ALIASES: Record<FieldKey, string[]> = {
  company: ["company", "employer", "organization", "org"],
  title: ["title", "job title", "position", "role", "job"],
  location: ["location", "city", "place", "where"],
  type: ["type", "work type", "remote/hybrid/onsite", "work model", "arrangement"],
  salary: ["salary", "pay", "compensation", "comp", "wage"],
  url: ["url", "link", "job url", "posting url", "job link"],
  status: ["status", "stage", "state", "pipeline"],
  notes: ["notes", "note", "comments", "comment"],
  description: ["description", "desc", "job description", "jd"],
};

const VALID_STATUSES = ["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn"];

function normalizeType(val: string): "remote" | "hybrid" | "onsite" {
  const v = (val || "").toLowerCase().trim();
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("onsite") || v.includes("on-site") || v.includes("office")) return "onsite";
  return "remote";
}

function normalizeStatus(val: string): string {
  const v = (val || "").toLowerCase().trim();
  return VALID_STATUSES.includes(v) ? v : "saved";
}

function staticMapHeaders(headers: string[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    for (const [field, alts] of Object.entries(STATIC_HEADER_ALIASES) as [FieldKey, string[]][]) {
      if (alts.includes(lower) && !(field in map)) {
        map[field] = i;
      }
    }
  });
  return map;
}

async function aiMapColumns(
  headers: string[],
  sampleRows: string[][],
): Promise<Partial<Record<FieldKey, number>>> {
  const { data, error } = await supabase.functions.invoke("map-bulk-columns", {
    body: { headers, sampleRows },
  });
  if (error) throw error;
  const mapping: Partial<Record<FieldKey, number>> = {};
  for (const [field, idx] of Object.entries(data || {})) {
    if (
      typeof idx === "number" &&
      idx >= 0 &&
      idx < headers.length &&
      JOB_FIELDS.some((f) => f.key === field)
    ) {
      mapping[field as FieldKey] = idx;
    }
  }
  return mapping;
}

interface ParsedRow {
  company: string;
  title: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary?: string;
  url?: string;
  status: string;
  notes?: string;
  description?: string;
  isDuplicate: boolean;
  selected: boolean;
}

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Source",
  2: "Upload",
  3: "Map columns",
  4: "Preview",
  5: "Import",
};

export function ImportJobsWizard({ open, onOpenChange, onImport, existingJobs }: ImportJobsWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [source, setSource] = useState<SourceKind>("csv");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<Partial<Record<FieldKey, number>>>({});
  const [usedAi, setUsedAi] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const existingKeys = useMemo(
    () =>
      new Set(
        existingJobs.map((j) => `${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}`),
      ),
    [existingJobs],
  );

  /** Reset all wizard state. Called when the dialog closes. */
  const reset = useCallback(() => {
    setStep(1);
    setSource("csv");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setColMap({});
    setUsedAi(false);
    setIsParsing(false);
    setRows([]);
    setImportedCount(0);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  /** Step 2: parse the chosen workbook into headers + raw rows, then auto-map. */
  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setIsParsing(true);
      setUsedAi(false);

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (jsonData.length < 2) {
          toast({ title: "Empty file", description: "No data rows found.", variant: "destructive" });
          setIsParsing(false);
          return;
        }

        const hdr = jsonData[0].map(String);
        const body = jsonData.slice(1).filter((r) => r.some((c) => String(c).trim()));
        let map = staticMapHeaders(hdr);

        const needsAi = !("company" in map) || !("title" in map);
        if (needsAi) {
          try {
            const sampleRows = body.slice(0, 3).map((r) => r.map(String));
            map = await aiMapColumns(hdr, sampleRows);
            setUsedAi(true);
          } catch (err) {
            // Fall through — user can still map manually in step 3.
            console.warn("AI mapping failed, user will map manually", err);
          }
        } else if (Object.keys(map).length < 5 && Object.keys(map).length < hdr.length) {
          // Try to enrich optional fields without blocking.
          try {
            const sampleRows = body.slice(0, 3).map((r) => r.map(String));
            const aiMap = await aiMapColumns(hdr, sampleRows);
            const before = Object.keys(map).length;
            for (const [field, idx] of Object.entries(aiMap) as [FieldKey, number][]) {
              if (!(field in map)) map[field] = idx;
            }
            if (Object.keys(map).length > before) setUsedAi(true);
          } catch {
            /* ignore enrichment failure */
          }
        }

        setHeaders(hdr);
        setRawRows(body);
        setColMap(map);
        setIsParsing(false);
        setStep(3);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not parse file.";
        toast({ title: "Parse error", description: message, variant: "destructive" });
        setIsParsing(false);
      }
      e.target.value = "";
    },
    [],
  );

  /** Step 3 → 4: build preview rows from the (possibly user-edited) column map. */
  const buildPreview = useCallback(() => {
    if (!("company" in colMap) || !("title" in colMap)) {
      toast({
        title: "Required columns missing",
        description: "Please map both Company and Job title before continuing.",
        variant: "destructive",
      });
      return;
    }
    const seen = new Set<string>();
    const built: ParsedRow[] = rawRows
      .map((row) => {
        const get = (field: FieldKey) =>
          field in colMap ? String(row[colMap[field]!] || "").trim() : "";
        const company = get("company");
        const title = get("title");
        if (!company || !title) return null;
        const key = `${company.toLowerCase()}|${title.toLowerCase()}`;
        const isDup = existingKeys.has(key) || seen.has(key);
        seen.add(key);
        return {
          company,
          title,
          location: get("location"),
          type: normalizeType(get("type")),
          salary: get("salary") || undefined,
          url: get("url") || undefined,
          status: normalizeStatus(get("status")),
          notes: get("notes") || undefined,
          description: get("description") || undefined,
          isDuplicate: isDup,
          selected: !isDup,
        } as ParsedRow;
      })
      .filter((r): r is ParsedRow => r !== null);

    if (built.length === 0) {
      toast({
        title: "No valid rows",
        description: "After mapping, no rows had both Company and Job title filled in.",
        variant: "destructive",
      });
      return;
    }
    setRows(built);
    setStep(4);
  }, [colMap, rawRows, existingKeys]);

  /** Step 5: commit selected rows via the bulk-insert callback. */
  const handleImport = useCallback(async () => {
    const toImport = rows
      .filter((r) => r.selected)
      .map(({ isDuplicate: _d, selected: _s, ...rest }) => ({
        ...rest,
        status: rest.status as Job["status"],
      }));
    if (toImport.length === 0) {
      toast({ title: "Nothing selected", variant: "destructive" });
      return;
    }
    await onImport(toImport);
    setImportedCount(toImport.length);
    setStep(5);
  }, [rows, onImport]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;
  const canContinueFromMap = "company" in colMap && "title" in colMap;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border bg-card px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Import jobs from a spreadsheet
          </DialogTitle>
          <StepIndicator current={step} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && <SourceStep source={source} onChange={setSource} />}

          {step === 2 && (
            <UploadStep
              source={source}
              isParsing={isParsing}
              fileName={fileName}
              onFile={handleFile}
            />
          )}

          {step === 3 && (
            <MapStep
              headers={headers}
              colMap={colMap}
              onChange={setColMap}
              usedAi={usedAi}
              fileName={fileName}
              rowCount={rawRows.length}
            />
          )}

          {step === 4 && (
            <PreviewStep
              rows={rows}
              onToggle={(i) =>
                setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)))
              }
              onSelectAll={(sel) => setRows((prev) => prev.map((r) => ({ ...r, selected: sel })))}
              onRemoveDuplicates={() => setRows((prev) => prev.filter((r) => !r.isDuplicate))}
              duplicateCount={duplicateCount}
              fileName={fileName}
            />
          )}

          {step === 5 && (
            <SuccessStep importedCount={importedCount} onClose={() => handleOpenChange(false)} />
          )}
        </div>

        {step !== 5 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === 1) handleOpenChange(false);
                else setStep((step - 1) as WizardStep);
              }}
            >
              {step === 1 ? <X className="mr-1.5 h-4 w-4" /> : <ArrowLeft className="mr-1.5 h-4 w-4" />}
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            {step === 1 && (
              <Button onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 2 && fileName && !isParsing && headers.length > 0 && (
              <Button onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={buildPreview} disabled={!canContinueFromMap}>
                Preview {rawRows.length} rows <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Import {selectedCount} job{selectedCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Step UI ─────────────────────────── */

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: WizardStep[] = [1, 2, 3, 4, 5];
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {steps.map((s) => {
        const state = s < current ? "done" : s === current ? "active" : "pending";
        return (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                state === "done" && "bg-success text-success-foreground",
                state === "active" && "bg-primary text-primary-foreground",
                state === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
            </div>
            <span
              className={cn(
                "hidden truncate text-xs sm:inline",
                state === "active" ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {s < 5 && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function SourceStep({ source, onChange }: { source: SourceKind; onChange: (s: SourceKind) => void }) {
  const opts: { key: SourceKind; title: string; desc: string }[] = [
    { key: "csv", title: "CSV file", desc: "Comma-separated. Most ATS exports (LinkedIn, Indeed, Greenhouse) work here." },
    { key: "xlsx", title: "Excel (XLSX / XLS)", desc: "Spreadsheets exported from Excel, Google Sheets, or Numbers." },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Where are your jobs coming from?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the file type you have. AI will figure out the column layout in the next step — your file does not need
          specific headers.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all hover:border-primary/40",
              source === o.key ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <div className="font-semibold">{o.title}</div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadStep({
  source,
  isParsing,
  fileName,
  onFile,
}: {
  source: SourceKind;
  isParsing: boolean;
  fileName: string;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const accept = source === "csv" ? ".csv" : ".xlsx,.xls";
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Upload your file</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop in a {source.toUpperCase()} export. The first row should be your column headers.
        </p>
      </div>

      {isParsing ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Parsing file & detecting columns…</p>
        </div>
      ) : (
        <label className="block">
          <input type="file" accept={accept} onChange={onFile} className="hidden" />
          <div className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 py-16 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <Upload className="h-10 w-10 text-muted-foreground/60" />
            <div className="text-center">
              <p className="font-medium">{fileName || `Click to choose a ${source.toUpperCase()} file`}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" /> AI column detection runs automatically
              </p>
            </div>
          </div>
        </label>
      )}

      {fileName && !isParsing && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Loaded <span className="font-medium">{fileName}</span>
        </div>
      )}
    </div>
  );
}

function MapStep({
  headers,
  colMap,
  onChange,
  usedAi,
  fileName,
  rowCount,
}: {
  headers: string[];
  colMap: Partial<Record<FieldKey, number>>;
  onChange: (m: Partial<Record<FieldKey, number>>) => void;
  usedAi: boolean;
  fileName: string;
  rowCount: number;
}) {
  const setField = (field: FieldKey, value: string) => {
    const next = { ...colMap };
    if (value === "__none__") delete next[field];
    else next[field] = Number(value);
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold">Map your columns</h3>
          {usedAi && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="h-3 w-3" /> AI-mapped
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Detected {headers.length} columns and {rowCount} rows in <span className="font-medium">{fileName}</span>. Adjust
          any incorrect mappings — only Company and Job title are required.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {JOB_FIELDS.map((field) => {
          const current = colMap[field.key];
          const value = current === undefined ? "__none__" : String(current);
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </label>
              <Select value={value} onValueChange={(v) => setField(field.key, v)}>
                <SelectTrigger
                  className={cn(
                    "h-9 text-sm",
                    field.required && current === undefined && "border-destructive/50",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not in file —</SelectItem>
                  {headers.map((h, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {h || `(column ${i + 1})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewStep({
  rows,
  onToggle,
  onSelectAll,
  onRemoveDuplicates,
  duplicateCount,
  fileName,
}: {
  rows: ParsedRow[];
  onToggle: (i: number) => void;
  onSelectAll: (sel: boolean) => void;
  onRemoveDuplicates: () => void;
  duplicateCount: number;
  fileName: string;
}) {
  const selectedCount = rows.filter((r) => r.selected).length;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg font-semibold">Review before importing</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} rows ready from {fileName}. Uncheck any you don't want — duplicates of jobs already in your
          tracker are flagged.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {selectedCount} of {rows.length} selected
          </Badge>
          {duplicateCount > 0 && (
            <Badge variant="outline" className="gap-1 border-warning/50 bg-warning/10 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />
              {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {duplicateCount > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onRemoveDuplicates}>
              <Trash2 className="mr-1 h-3 w-3" /> Remove duplicates
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectAll(true)}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectAll(false)}>
            Deselect all
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-lg border border-border">
        <div className="min-w-[600px]">
          <div className="sticky top-0 grid grid-cols-[32px_1fr_1fr_100px_80px_80px] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <span />
            <span>Company</span>
            <span>Title</span>
            <span>Location</span>
            <span>Type</span>
            <span>Status</span>
          </div>
          {rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[32px_1fr_1fr_100px_80px_80px] items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0",
                row.isDuplicate && "bg-warning/5",
                !row.selected && "opacity-50",
              )}
            >
              <Checkbox checked={row.selected} onCheckedChange={() => onToggle(i)} />
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{row.company}</span>
                {row.isDuplicate && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
              </div>
              <span className="truncate">{row.title}</span>
              <span className="truncate text-muted-foreground">{row.location}</span>
              <span className="capitalize text-muted-foreground">{row.type}</span>
              <Badge variant="secondary" className="w-fit text-[10px] capitalize">
                {row.status}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SuccessStep({ importedCount, onClose }: { importedCount: number; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold">
          {importedCount} job{importedCount !== 1 ? "s" : ""} imported
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          They're now in your pipeline at status “Saved”. You can reorganize them on the Jobs page.
        </p>
      </div>
      <Button onClick={onClose} className="mt-2">
        Done
      </Button>
    </div>
  );
}

export default ImportJobsWizard;
