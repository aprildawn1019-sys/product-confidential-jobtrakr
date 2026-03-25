import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, AlertTriangle, Trash2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { Job } from "@/types/jobTracker";

interface BulkJobUploadDialogProps {
  onAddJobs: (jobs: Omit<Job, "id" | "createdAt">[]) => void;
  existingJobs: Job[];
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

function normalizeType(val: string): "remote" | "hybrid" | "onsite" {
  const v = (val || "").toLowerCase().trim();
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("onsite") || v.includes("on-site") || v.includes("office")) return "onsite";
  return "remote";
}

function normalizeStatus(val: string): string {
  const v = (val || "").toLowerCase().trim();
  const valid = ["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn"];
  return valid.includes(v) ? v : "saved";
}

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
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
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    for (const [field, alts] of Object.entries(aliases)) {
      if (alts.includes(lower) && !(field in map)) {
        map[field] = i;
      }
    }
  });
  return map;
}

export default function BulkJobUploadDialog({ onAddJobs, existingJobs }: BulkJobUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const existingKeys = useMemo(() => {
    return new Set(existingJobs.map(j => `${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}`));
  }, [existingJobs]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        toast({ title: "Empty file", description: "No data rows found.", variant: "destructive" });
        return;
      }

      const headers = jsonData[0].map(String);
      const colMap = normalizeHeaders(headers);

      if (!("company" in colMap) || !("title" in colMap)) {
        toast({
          title: "Missing required columns",
          description: "File must have at least 'Company' and 'Title' columns.",
          variant: "destructive",
        });
        return;
      }

      const parsed: ParsedRow[] = jsonData.slice(1)
        .filter(row => row.some(cell => String(cell).trim()))
        .map(row => {
          const get = (field: string) => field in colMap ? String(row[colMap[field]] || "").trim() : "";
          const company = get("company");
          const title = get("title");
          const key = `${company.toLowerCase()}|${title.toLowerCase()}`;
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
            isDuplicate: existingKeys.has(key),
            selected: !existingKeys.has(key),
          };
        })
        .filter(r => r.company && r.title);

      // Also check for in-file duplicates
      const seen = new Set<string>();
      parsed.forEach(r => {
        const key = `${r.company.toLowerCase()}|${r.title.toLowerCase()}`;
        if (seen.has(key) && !r.isDuplicate) {
          r.isDuplicate = true;
          r.selected = false;
        }
        seen.add(key);
      });

      setRows(parsed);
      toast({ title: `Parsed ${parsed.length} rows`, description: `${parsed.filter(r => r.isDuplicate).length} duplicates found.` });
    } catch (err: any) {
      toast({ title: "Parse error", description: err.message || "Could not parse file.", variant: "destructive" });
    }
    e.target.value = "";
  }, [existingKeys]);

  const toggleRow = (index: number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  };

  const selectAll = (selected: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected })));
  };

  const removeDuplicates = () => {
    setRows(prev => prev.filter(r => !r.isDuplicate));
  };

  const handleImport = () => {
    const toImport = rows.filter(r => r.selected).map(({ isDuplicate, selected, ...rest }) => ({
      ...rest,
      status: rest.status as Job["status"],
    }));
    if (toImport.length === 0) {
      toast({ title: "No rows selected", variant: "destructive" });
      return;
    }
    onAddJobs(toImport);
    toast({ title: `${toImport.length} jobs imported!` });
    setRows([]);
    setFileName("");
    setOpen(false);
  };

  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setRows([]); setFileName(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-1" />Bulk Upload</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />Bulk Upload Jobs
          </DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium">Upload CSV or XLSX file</p>
              <p className="text-sm text-muted-foreground mt-1">
                Required columns: <strong>Company</strong>, <strong>Title</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Location, Type, Salary, URL, Status, Notes, Description
              </p>
              <label className="mt-4 inline-block">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                <span className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-4 w-4" />Choose File
                </span>
              </label>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Expected CSV format:</p>
              <code className="text-xs text-muted-foreground block whitespace-pre">Company,Title,Location,Type,Salary,URL,Status,Notes{"\n"}Acme Inc,Software Engineer,Remote,remote,$150k,https://...,saved,Great fit</code>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{rows.length} rows from {fileName}</span>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 border-warning/50 text-warning bg-warning/10">
                    <AlertTriangle className="h-3 w-3" />{duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {duplicateCount > 0 && (
                  <Button variant="outline" size="sm" className="text-xs" onClick={removeDuplicates}>
                    <Trash2 className="h-3 w-3 mr-1" />Remove Duplicates
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(true)}>Select All</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(false)}>Deselect All</Button>
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 border border-border rounded-lg">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[32px_1fr_1fr_100px_80px_70px] gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border sticky top-0">
                  <span></span>
                  <span>Company</span>
                  <span>Title</span>
                  <span>Location</span>
                  <span>Type</span>
                  <span>Status</span>
                </div>
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[32px_1fr_1fr_100px_80px_70px] gap-2 px-3 py-2 text-sm items-center border-b border-border last:border-0 ${
                      row.isDuplicate ? "bg-warning/5" : ""
                    } ${!row.selected ? "opacity-50" : ""}`}
                  >
                    <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(i)} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{row.company}</span>
                      {row.isDuplicate && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                    </div>
                    <span className="truncate">{row.title}</span>
                    <span className="truncate text-muted-foreground">{row.location}</span>
                    <span className="capitalize text-muted-foreground">{row.type}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize w-fit">{row.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Import button */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(""); }}>
                Upload Different File
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Import {selectedCount} Job{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
