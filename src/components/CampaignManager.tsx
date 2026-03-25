import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Trash2, Edit2, X } from "lucide-react";
import type { Campaign } from "@/types/jobTracker";

interface CampaignManagerProps {
  campaigns: Campaign[];
  onAdd: (campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (id: string, updates: Partial<Campaign>) => void;
  onDelete: (id: string) => void;
}

const campaignTypes = [
  { value: "outreach", label: "Outreach" },
  { value: "follow-up", label: "Follow-up" },
  { value: "referral", label: "Referral" },
  { value: "networking", label: "Networking" },
  { value: "cold-email", label: "Cold Email" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary",
  paused: "bg-warning/10 text-warning",
  completed: "bg-green-500/10 text-green-600",
  archived: "bg-muted text-muted-foreground",
};

export default function CampaignManager({ campaigns, onAdd, onUpdate, onDelete }: CampaignManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "outreach", description: "", status: "draft" });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    onAdd({ name: form.name.trim(), type: form.type, description: form.description.trim() || undefined, status: form.status });
    setForm({ name: "", type: "outreach", description: "", status: "draft" });
    setCreateOpen(false);
  };

  const handleUpdate = (id: string) => {
    onUpdate(id, { name: form.name.trim(), type: form.type, description: form.description.trim() || undefined, status: form.status });
    setEditingId(null);
    setForm({ name: "", type: "outreach", description: "", status: "draft" });
  };

  const startEdit = (c: Campaign) => {
    setForm({ name: c.name, type: c.type, description: c.description || "", status: c.status });
    setEditingId(c.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Megaphone className="h-4 w-4" />Campaigns</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Q1 Tech Outreach" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{campaignTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Campaign goals, target audience..." rows={3} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-4">No campaigns yet</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-7 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{campaignTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-xs" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs" onClick={() => handleUpdate(c.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge className={`text-[10px] capitalize ${statusColors[c.status] || ""}`}>{c.status}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.type}</Badge>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(c)}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
