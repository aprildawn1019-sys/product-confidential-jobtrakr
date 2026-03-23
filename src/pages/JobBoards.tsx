import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, ExternalLink, Trash2, Globe, Sparkles } from "lucide-react";

interface JobBoard {
  id: string;
  name: string;
  url: string | null;
  category: string;
  is_active: boolean;
  notes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  tech: "Tech",
  product: "Product",
  executive: "Executive",
  startup: "Startup",
  life_sciences: "Life Sciences",
  education: "Education",
  finance: "Finance",
  ats: "Company ATS",
};

const RECOMMENDED_BOARDS = [
  { name: "ExecThread", url: "https://execthread.com", category: "executive", reason: "Curated executive roles $200K+, strong for VP/Director level" },
  { name: "Chief", url: "https://chief.com", category: "executive", reason: "Executive network focused on senior women leaders" },
  { name: "BioSpace", url: "https://biospace.com", category: "life_sciences", reason: "Top board for Life Sciences/Biotech — your #1 industry preference" },
  { name: "Mind the Product", url: "https://mindtheproduct.com/product-management-jobs", category: "product", reason: "Premier product management community job board" },
  { name: "HigherEdJobs", url: "https://higheredjobs.com", category: "education", reason: "Matches your deep Higher Ed/EdTech experience" },
  { name: "Ladders", url: "https://theladders.com", category: "executive", reason: "Focused on $100K+ roles, strong executive pipeline" },
  { name: "Wellfound (AngelList)", url: "https://wellfound.com", category: "startup", reason: "High-growth startups often offering strong equity packages" },
];

export default function JobBoards() {
  const [boards, setBoards] = useState<JobBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({ name: "", url: "", category: "general", notes: "" });

  useEffect(() => { loadBoards(); }, []);

  const loadBoards = async () => {
    const { data } = await supabase.from("job_boards").select("*").order("is_active", { ascending: false }).order("name");
    if (data) setBoards(data as JobBoard[]);
    setLoading(false);
  };

  const toggleActive = async (board: JobBoard) => {
    const { error } = await supabase.from("job_boards").update({ is_active: !board.is_active }).eq("id", board.id);
    if (!error) {
      setBoards(prev => prev.map(b => b.id === board.id ? { ...b, is_active: !b.is_active } : b));
    }
  };

  const handleAdd = async () => {
    if (!newBoard.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("job_boards").insert({
      user_id: user.id,
      name: newBoard.name.trim(),
      url: newBoard.url.trim() || null,
      category: newBoard.category,
      notes: newBoard.notes.trim() || null,
      is_active: true,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setBoards(prev => [data as JobBoard, ...prev]);
    setNewBoard({ name: "", url: "", category: "general", notes: "" });
    setAddOpen(false);
    toast({ title: "Board added", description: `${newBoard.name} added to your job boards.` });
  };

  const handleDelete = async (board: JobBoard) => {
    const { error } = await supabase.from("job_boards").delete().eq("id", board.id);
    if (!error) {
      setBoards(prev => prev.filter(b => b.id !== board.id));
      toast({ title: "Board removed", description: `${board.name} has been removed.` });
    }
  };

  const handleAddRecommended = async (rec: typeof RECOMMENDED_BOARDS[0]) => {
    if (boards.some(b => b.name === rec.name)) {
      // Already exists, just activate it
      const existing = boards.find(b => b.name === rec.name);
      if (existing && !existing.is_active) {
        await toggleActive(existing);
        toast({ title: "Board activated", description: `${rec.name} is now active in your searches.` });
      } else {
        toast({ title: "Already added", description: `${rec.name} is already in your boards.` });
      }
      return;
    }

    const { data, error } = await supabase.from("job_boards").insert({
      name: rec.name,
      url: rec.url,
      category: rec.category,
      is_active: true,
    }).select().single();

    if (!error && data) {
      setBoards(prev => [data as JobBoard, ...prev]);
      toast({ title: "Board added", description: `${rec.name} added and activated.` });
    }
  };

  const activeBoards = boards.filter(b => b.is_active);
  const inactiveBoards = boards.filter(b => !b.is_active);

  // Filter recommendations to only show ones not currently active
  const availableRecommendations = RECOMMENDED_BOARDS.filter(
    rec => !boards.some(b => b.name === rec.name && b.is_active)
  );

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Boards</h1>
          <p className="mt-1 text-muted-foreground">
            Manage which job boards the AI searches. {activeBoards.length} active, {inactiveBoards.length} inactive.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Add Board</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add Job Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Board Name *</Label>
                <Input value={newBoard.name} onChange={e => setNewBoard(f => ({ ...f, name: e.target.value }))} placeholder="e.g. TechCrunch Jobs" />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={newBoard.url} onChange={e => setNewBoard(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newBoard.category} onValueChange={v => setNewBoard(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={newBoard.notes} onChange={e => setNewBoard(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!newBoard.name.trim()}>Add Board</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recommendations */}
      {availableRecommendations.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-sm">Recommended for Your Profile</h2>
          </div>
          <div className="space-y-2">
            {availableRecommendations.map(rec => (
              <div key={rec.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{rec.name}</span>
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{CATEGORY_LABELS[rec.category]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleAddRecommended(rec)}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Boards */}
      <div className="space-y-2">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Active Boards ({activeBoards.length})</h2>
        {activeBoards.map(board => (
          <div key={board.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Switch checked={board.is_active} onCheckedChange={() => toggleActive(board)} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{board.name}</span>
                  <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{CATEGORY_LABELS[board.category] || board.category}</span>
                </div>
                {board.notes && <p className="text-xs text-muted-foreground mt-0.5">{board.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {board.url && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={board.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDelete(board)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive Boards */}
      {inactiveBoards.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Inactive Boards ({inactiveBoards.length})</h2>
          {inactiveBoards.map(board => (
            <div key={board.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-border bg-card opacity-60">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch checked={board.is_active} onCheckedChange={() => toggleActive(board)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{board.name}</span>
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{CATEGORY_LABELS[board.category] || board.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {board.url && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={board.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(board)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
