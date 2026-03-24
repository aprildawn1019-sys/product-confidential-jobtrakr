import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Contact } from "@/types/jobTracker";

interface LinkedInImportDialogProps {
  onImport: (contacts: Omit<Contact, "id" | "createdAt">[]) => void;
  existingContacts: Contact[];
}

interface ParsedRow {
  name: string;
  company: string;
  role: string;
  email?: string;
  linkedin?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += char;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function mapLinkedInRow(row: Record<string, string>): ParsedRow | null {
  const first = row["First Name"] || row["first name"] || "";
  const last = row["Last Name"] || row["last name"] || "";
  const name = `${first} ${last}`.trim();
  if (!name) return null;

  const company = row["Company"] || row["company"] || row["Organization"] || "";
  const role = row["Position"] || row["position"] || row["Title"] || "";
  const email = row["Email Address"] || row["email address"] || row["Email"] || "";
  const url = row["URL"] || row["url"] || row["Profile URL"] || "";
  const linkedin = url ? url.replace(/^https?:\/\//, "") : "";

  return { name, company: company || "Unknown", role, email: email || undefined, linkedin: linkedin || undefined };
}

export default function LinkedInImportDialog({ onImport, existingContacts }: LinkedInImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [dupes, setDupes] = useState(0);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setParsed([]); setDupes(0); setFileName(""); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const mapped = rows.map(mapLinkedInRow).filter((r): r is ParsedRow => r !== null);

      const existingNames = new Set(existingContacts.map(c => c.name.toLowerCase()));
      const unique = mapped.filter(r => !existingNames.has(r.name.toLowerCase()));
      setDupes(mapped.length - unique.length);
      setParsed(unique);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed.map(p => ({ name: p.name, company: p.company, role: p.role, email: p.email, linkedin: p.linkedin })));
    toast({ title: "Import complete", description: `${parsed.length} contacts imported from LinkedIn.` });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4" /> Import LinkedIn</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Import LinkedIn Connections</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Go to <span className="font-medium text-foreground">linkedin.com/mypreferences/d/download-my-data</span> and request your data. Upload the <span className="font-mono text-xs bg-muted px-1 rounded">Connections.csv</span> file here.
        </p>

        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

        {!fileName ? (
          <Button variant="outline" className="w-full h-20 border-dashed flex-col gap-1" onClick={() => fileRef.current?.click()}>
            <FileText className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Choose Connections.csv</span>
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{parsed.length} new contacts found</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { reset(); fileRef.current?.click(); }}>Change</Button>
            </div>

            {dupes > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                {dupes} duplicate{dupes > 1 ? "s" : ""} skipped (already in your contacts)
              </div>
            )}

            {parsed.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {parsed.slice(0, 50).map((p, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground truncate ml-2">{p.company}</span>
                  </div>
                ))}
                {parsed.length > 50 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                    …and {parsed.length - 50} more
                  </div>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleImport} disabled={parsed.length === 0}>
              <Check className="h-4 w-4" /> Import {parsed.length} Contact{parsed.length !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
