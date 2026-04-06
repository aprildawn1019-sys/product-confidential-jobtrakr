import { useState, useEffect } from "react";
import { FileText, Copy, Check, Trash2, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import CompanyAvatar from "@/components/CompanyAvatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface CoverLetter {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  content: string;
  created_at: string;
}

export default function CoverLetters() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cover_letters")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLetters(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cover_letters").delete().eq("id", id);
    setLetters(prev => prev.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ title: "Cover letter deleted" });
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = letters.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.job_title.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Cover Letters
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View, copy, and manage all your generated cover letters.
        </p>
      </div>

      {letters.length > 0 && (
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by job title or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary" className="shrink-0">{filtered.length} letter{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>
      )}

      {letters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No cover letters yet</h3>
            <p className="text-sm text-muted-foreground">
              Generate your first cover letter from any job's detail page using the "Cover Letter" button.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No cover letters match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => {
            const isExpanded = expandedId === letter.id;
            const isCopied = copiedId === letter.id;
            return (
              <Card key={letter.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar company={letter.company} />
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : letter.id)}
                    >
                      <p className="font-medium text-sm truncate">{letter.job_title}</p>
                      <p className="text-xs text-muted-foreground">{letter.company} · {formatDistanceToNow(new Date(letter.created_at), { addSuffix: true })}</p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(letter.id, letter.content)}>
                        {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      {letter.job_id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`/jobs/${letter.job_id}`}><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete cover letter?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the cover letter for {letter.job_title} at {letter.company}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(letter.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : letter.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {letter.content}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
