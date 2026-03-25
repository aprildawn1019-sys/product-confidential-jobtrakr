import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, AlertTriangle, Trash2, FileSpreadsheet, CheckCircle2, Sparkles, Loader2, FileWarning } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/types/jobTracker";

interface BulkContactUploadDialogProps {
  onAddBulk: (contacts: Omit<Contact, "id" | "createdAt">[]) => void;
  existingContacts: Contact[];
}

interface ParsedContactRow {
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
  isDuplicate: boolean;
  selected: boolean;
  issues: string[];
}

interface UploadReport {
  totalRows: number;
  validRows: number;
  duplicates: number;
  issueRows: number;
  issues: { row: number; field: string; problem: string; suggestion: string }[];
}

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    name: ["name", "full name", "contact name", "first name", "person"],
    company: ["company", "employer", "organization", "org", "firm"],
    role: ["role", "title", "job title", "position"],
    email: ["email", "e-mail", "email address", "mail"],
    phone: ["phone", "telephone", "mobile", "cell", "phone number"],
    linkedin: ["linkedin", "linkedin url", "linkedin profile", "li"],
    notes: ["notes", "note", "comments", "comment"],
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

async function aiMapColumns(headers: string[], sampleRows: string[][]): Promise<Record<string, number>> {
  const { data, error } = await supabase.functions.invoke("map-bulk-columns", {
    body: {
      headers,
      sampleRows,
      targetFields: [
        { name: "name", description: "Person's full name", required: true },
        { name: "company", description: "Company or organization name", required: true },
        { name: "role", description: "Job title or role" },
        { name: "email", description: "Email address" },
        { name: "phone", description: "Phone number" },
        { name: "linkedin", description: "LinkedIn profile URL" },
        { name: "notes", description: "Any notes or comments" },
      ],
    },
  });
  if (error) throw error;
  const mapping: Record<string, number> = {};
  for (const [field, idx] of Object.entries(data)) {
    if (typeof idx === "number" && idx >= 0 && idx < headers.length) {
      mapping[field] = idx;
    }
  }
  return mapping;
}

export default function BulkContactUploadDialog({ onAddBulk, existingContacts }: BulkContactUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedContactRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const [report, setReport] = useState<UploadReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const existingKeys = useMemo(() => {
    return new Set(existingContacts.map(c => `${c.name.toLowerCase().trim()}|${c.company.toLowerCase().trim()}`));
  }, [existingContacts]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    setUsedAi(false);
    setReport(null);

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

      const headers = jsonData[0].map(String);
      let colMap = normalizeHeaders(headers);

      const needsAi = !("name" in colMap) || !("company" in colMap);
      if (needsAi) {
        try {
          const sampleRows = jsonData.slice(1, 4).map(r => r.map(String));
          colMap = await aiMapColumns(headers, sampleRows);
          setUsedAi(true);
          if (!("name" in colMap) || !("company" in colMap)) {
            toast({ title: "Could not identify required columns", description: "AI couldn't find Name and Company columns.", variant: "destructive" });
            setIsParsing(false);
            return;
          }
        } catch (err: any) {
          toast({ title: "AI mapping failed", description: err.message || "Ensure 'Name' and 'Company' headers exist.", variant: "destructive" });
          setIsParsing(false);
          return;
        }
      } else {
        const staticCount = Object.keys(colMap).length;
        if (staticCount < headers.length && staticCount < 4) {
          try {
            const sampleRows = jsonData.slice(1, 4).map(r => r.map(String));
            const aiMap = await aiMapColumns(headers, sampleRows);
            for (const [field, idx] of Object.entries(aiMap)) {
              if (!(field in colMap)) colMap[field] = idx;
            }
            if (Object.keys(aiMap).length > staticCount) setUsedAi(true);
          } catch {}
        }
      }

      const issueList: UploadReport["issues"] = [];
      const parsed: ParsedContactRow[] = jsonData.slice(1)
        .filter(row => row.some(cell => String(cell).trim()))
        .map((row, rowIdx) => {
          const get = (field: string) => field in colMap ? String(row[colMap[field]] || "").trim() : "";
          const name = get("name");
          const company = get("company");
          const email = get("email");
          const phone = get("phone");
          const linkedin = get("linkedin");
          const key = `${name.toLowerCase()}|${company.toLowerCase()}`;
          const issues: string[] = [];

          if (!name) {
            issues.push("Missing name");
            issueList.push({ row: rowIdx + 2, field: "name", problem: "Name is empty", suggestion: "Add a name or remove this row" });
          }
          if (!company) {
            issues.push("Missing company");
            issueList.push({ row: rowIdx + 2, field: "company", problem: "Company is empty", suggestion: "Add a company name" });
          }
          if (email && !email.includes("@")) {
            issues.push("Invalid email");
            issueList.push({ row: rowIdx + 2, field: "email", problem: `"${email}" is not a valid email`, suggestion: "Fix email format (e.g., user@domain.com)" });
          }
          if (linkedin && !linkedin.includes("linkedin")) {
            issues.push("Invalid LinkedIn");
            issueList.push({ row: rowIdx + 2, field: "linkedin", problem: `"${linkedin}" doesn't look like a LinkedIn URL`, suggestion: "Use format: linkedin.com/in/username" });
          }

          return {
            name,
            company,
            role: get("role"),
            email: email || undefined,
            phone: phone || undefined,
            linkedin: linkedin || undefined,
            notes: get("notes") || undefined,
            isDuplicate: existingKeys.has(key),
            selected: !existingKeys.has(key) && issues.length === 0,
            issues,
          };
        })
        .filter(r => r.name || r.company);

      const seen = new Set<string>();
      parsed.forEach(r => {
        const key = `${r.name.toLowerCase()}|${r.company.toLowerCase()}`;
        if (seen.has(key) && !r.isDuplicate) {
          r.isDuplicate = true;
          r.selected = false;
        }
        seen.add(key);
      });

      const uploadReport: UploadReport = {
        totalRows: parsed.length,
        validRows: parsed.filter(r => r.issues.length === 0 && !r.isDuplicate).length,
        duplicates: parsed.filter(r => r.isDuplicate).length,
        issueRows: parsed.filter(r => r.issues.length > 0).length,
        issues: issueList,
      };

      setRows(parsed);
      setReport(uploadReport);
      if (issueList.length > 0) setShowReport(true);
      toast({ title: `Parsed ${parsed.length} rows`, description: `${uploadReport.duplicates} duplicates, ${uploadReport.issueRows} with issues.` });
    } catch (err: any) {
      toast({ title: "Parse error", description: err.message || "Could not parse file.", variant: "destructive" });
    }
    setIsParsing(false);
    e.target.value = "";
  }, [existingKeys]);

  const toggleRow = (index: number) => setRows(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  const selectAll = (selected: boolean) => setRows(prev => prev.map(r => ({ ...r, selected })));
  const removeDuplicates = () => setRows(prev => prev.filter(r => !r.isDuplicate));
  const removeWithIssues = () => setRows(prev => prev.filter(r => r.issues.length === 0));

  const handleImport = () => {
    const toImport = rows.filter(r => r.selected).map(({ isDuplicate, selected, issues, ...rest }) => rest);
    if (toImport.length === 0) {
      toast({ title: "No rows selected", variant: "destructive" });
      return;
    }
    onAddBulk(toImport);
    toast({ title: `${toImport.length} contacts imported!` });
    setRows([]);
    setFileName("");
    setReport(null);
    setOpen(false);
  };

  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const issueCount = rows.filter(r => r.issues.length > 0).length;
  const selectedCount = rows.filter(r => r.selected).length;

  const reset = () => { setRows([]); setFileName(""); setUsedAi(false); setReport(null); setShowReport(false); };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-1" />Bulk Upload</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />Bulk Upload Connections
          </DialogTitle>
        </DialogHeader>

        {isParsing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Parsing file & mapping columns with AI…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium">Upload CSV or XLSX file</p>
              <p className="text-sm text-muted-foreground mt-1">AI will automatically map your columns</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />Powered by AI column detection
              </p>
              <label className="mt-4 inline-block">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                <span className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-4 w-4" />Choose File
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Report banner */}
            {report && (report.issueRows > 0 || report.duplicates > 0) && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Upload Report</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowReport(!showReport)}>
                    {showReport ? "Hide" : "Show"} Details
                  </Button>
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span>{report.totalRows} total</span>
                  <span className="text-green-600">{report.validRows} valid</span>
                  {report.duplicates > 0 && <span className="text-warning">{report.duplicates} duplicates</span>}
                  {report.issueRows > 0 && <span className="text-destructive">{report.issueRows} with issues</span>}
                </div>
                {showReport && report.issues.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {report.issues.map((issue, i) => (
                      <div key={i} className="text-xs rounded bg-background px-2 py-1 flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">Row {issue.row}:</span>
                        <span className="text-destructive">{issue.problem}</span>
                        <span className="text-muted-foreground">→ {issue.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{rows.length} rows from {fileName}</span>
                {usedAi && <Badge variant="secondary" className="text-xs gap-1"><Sparkles className="h-3 w-3" />AI-mapped</Badge>}
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 border-warning/50 text-warning bg-warning/10">
                    <AlertTriangle className="h-3 w-3" />{duplicateCount} dup{duplicateCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {issueCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 border-destructive/50 text-destructive bg-destructive/10">
                    <FileWarning className="h-3 w-3" />{issueCount} issue{issueCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {duplicateCount > 0 && <Button variant="outline" size="sm" className="text-xs" onClick={removeDuplicates}><Trash2 className="h-3 w-3 mr-1" />Remove Dups</Button>}
                {issueCount > 0 && <Button variant="outline" size="sm" className="text-xs" onClick={removeWithIssues}><Trash2 className="h-3 w-3 mr-1" />Remove Issues</Button>}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(true)}>Select All</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(false)}>Deselect All</Button>
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 border border-border rounded-lg">
              <div className="min-w-[550px]">
                <div className="grid grid-cols-[32px_1fr_1fr_1fr_80px] gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border sticky top-0">
                  <span></span><span>Name</span><span>Company</span><span>Role</span><span>Issues</span>
                </div>
                {rows.map((row, i) => (
                  <div key={i} className={`grid grid-cols-[32px_1fr_1fr_1fr_80px] gap-2 px-3 py-2 text-sm items-center border-b border-border last:border-0 ${row.isDuplicate ? "bg-warning/5" : ""} ${row.issues.length > 0 ? "bg-destructive/5" : ""} ${!row.selected ? "opacity-50" : ""}`}>
                    <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(i)} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{row.name || <span className="italic text-muted-foreground">—</span>}</span>
                      {row.isDuplicate && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                    </div>
                    <span className="truncate">{row.company || <span className="italic text-muted-foreground">—</span>}</span>
                    <span className="truncate text-muted-foreground">{row.role}</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {row.issues.map((issue, j) => (
                        <Badge key={j} variant="outline" className="text-[9px] border-destructive/50 text-destructive">{issue}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={reset}>Upload Different File</Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Import {selectedCount} Contact{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
