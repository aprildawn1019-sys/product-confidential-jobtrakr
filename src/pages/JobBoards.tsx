import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { BoardCard } from "@/components/jobboards/BoardCard";

interface JobBoard {
  id: string;
  name: string;
  url: string | null;
  category: string;
  is_active: boolean;
  notes: string | null;
  is_gated: boolean;
  public_url: string | null;
  gate_checked_at: string | null;
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
  { name: "LinkedIn", url: "https://linkedin.com/jobs", category: "general", reason: "Largest professional network — essential for executive and product roles" },
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
  const [testing, setTesting] = useState(false);
  const [newBoard, setNewBoard] = useState({ name: "", url: "", category: "general", notes: "" });

  useEffect(() => { loadBoards(); }, []);

  const loadBoards = async () => {
    const { data } = await supabase.from("job_boards").select("*").order("is_active", { ascending: false }).order("name");
    if (data) setBoards(data as unknown as JobBoard[]);
    setLoading(false);
  };

  const toggleActive = async (board: JobBoard) => {
    const { error } = await supabase.from("job_boards").update({ is_active: !board.is_active } as any).eq("id", board.id);
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
    } as any).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setBoards(prev => [data as unknown as JobBoard, ...prev]);
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
      const existing = boards.find(b => b.name === rec.name);
      if (existing && !existing.is_active) {
        await toggleActive(existing);
        toast({ title: "Board activated", description: `${rec.name} is now active in your searches.` });
      } else {
        toast({ title: "Already added", description: `${rec.name} is already in your boards.` });
      }
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("job_boards").insert({
      user_id: user.id,
      name: rec.name,
      url: rec.url,
      category: rec.category,
      is_active: true,
    } as any).select().single();

    if (error) {
      toast({ title: "Error adding board", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setBoards(prev => [data as unknown as JobBoard, ...prev]);
      toast({ title: "Board added", description: `${rec.name} added and activated.` });
    }
  };

  const handleUsePublicUrl = async (board: JobBoard) => {
    if (!board.public_url) return;
    const { error } = await supabase.from("job_boards")
      .update({ url: board.public_url, is_gated: false, public_url: null } as any)
      .eq("id", board.id);
    if (!error) {
      setBoards(prev => prev.map(b =>
        b.id === board.id ? { ...b, url: board.public_url, is_gated: false, public_url: null } : b
      ));
      toast({ title: "URL updated", description: `${board.name} switched to public URL.` });
    }
  };

  const handleTestAllBoards = async () => {
    const boardsWithUrls = boards.filter(b => b.url && b.is_active);
    if (boardsWithUrls.length === 0) {
      toast({ title: "No boards to test", description: "No active boards with URLs found." });
      return;
    }

    setTesting(true);
    toast({ title: "Testing board access…", description: `Checking ${boardsWithUrls.length} active boards for login gates.` });

    try {
      const { data, error } = await supabase.functions.invoke("test-board-access", {
        body: { boards: boardsWithUrls.map(b => ({ id: b.id, name: b.name, url: b.url })) },
      });

      if (error) {
        toast({ title: "Test failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.results) {
        const now = new Date().toISOString();
        let gatedCount = 0;

        for (const result of data.results) {
          const isGated = result.is_gated === true;
          if (isGated) gatedCount++;

          // Update DB
          await supabase.from("job_boards").update({
            is_gated: isGated,
            public_url: result.public_url || null,
            gate_checked_at: now,
          } as any).eq("id", result.id);

          // Update local state
          setBoards(prev => prev.map(b =>
            b.id === result.id
              ? { ...b, is_gated: isGated, public_url: result.public_url || null, gate_checked_at: now }
              : b
          ));
        }

        if (gatedCount > 0) {
          toast({
            title: `${gatedCount} board${gatedCount > 1 ? 's' : ''} require login`,
            description: "Gated boards are flagged below with suggested alternatives.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "All boards accessible ✓",
            description: `${boardsWithUrls.length} boards tested — no login gates detected.`,
          });
        }
      }
    } catch (err) {
      console.error("Error testing boards:", err);
      toast({ title: "Test error", description: "Failed to test board access.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const activeBoards = boards.filter(b => b.is_active);
  const inactiveBoards = boards.filter(b => !b.is_active);
  const gatedActiveCount = activeBoards.filter(b => b.is_gated).length;

  const availableRecommendations = RECOMMENDED_BOARDS.filter(
    rec => !boards.some(b => b.name === rec.name && b.is_active)
  );

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Boards</h1>
          <p className="mt-1 text-muted-foreground">
            Manage which job boards the AI searches. {activeBoards.length} active, {inactiveBoards.length} inactive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTestAllBoards} disabled={testing}>
            {testing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Test Access</>
            )}
          </Button>
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
      </div>

      {/* Gate warning banner */}
      {gatedActiveCount > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {gatedActiveCount} active board{gatedActiveCount > 1 ? 's' : ''} require{gatedActiveCount === 1 ? 's' : ''} login
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gated boards may return limited or no results during AI searches. Switch to public URLs where available, or deactivate boards you can't access.
            </p>
          </div>
        </div>
      )}

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
          <BoardCard
            key={board.id}
            board={board}
            categoryLabels={CATEGORY_LABELS}
            onToggle={toggleActive}
            onDelete={handleDelete}
            onUsePublicUrl={handleUsePublicUrl}
          />
        ))}
      </div>

      {/* Inactive Boards */}
      {inactiveBoards.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Inactive Boards ({inactiveBoards.length})</h2>
          {inactiveBoards.map(board => (
            <BoardCard
              key={board.id}
              board={board}
              categoryLabels={CATEGORY_LABELS}
              onToggle={toggleActive}
              onDelete={handleDelete}
              onUsePublicUrl={handleUsePublicUrl}
              inactive
            />
          ))}
        </div>
      )}
    </div>
  );
}
