import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Contact } from "@/types/jobTracker";

interface AddContactDialogProps {
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
}

export default function AddContactDialog({ onAdd }: AddContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", role: "", email: "", phone: "", linkedin: "", notes: "",
    relationshipWarmth: "", conversationLog: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company) return;
    onAdd({
      ...form,
      relationshipWarmth: form.relationshipWarmth || undefined,
      conversationLog: form.conversationLog || undefined,
    });
    setForm({ name: "", company: "", role: "", email: "", phone: "", linkedin: "", notes: "", relationshipWarmth: "", conversationLog: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add Contact</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Job title" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="linkedin.com/in/..." />
            </div>
            <div className="space-y-2">
              <Label>Warmth</Label>
              <Select value={form.relationshipWarmth} onValueChange={v => setForm(f => ({ ...f, relationshipWarmth: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                  <SelectItem value="warm">🌤️ Warm</SelectItem>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="champion">🏆 Champion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conversation Notes</Label>
            <Textarea value={form.conversationLog} onChange={e => setForm(f => ({ ...f, conversationLog: e.target.value }))} placeholder="Initial notes about this contact..." rows={3} />
          </div>
          <Button type="submit" className="w-full">Add Contact</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
