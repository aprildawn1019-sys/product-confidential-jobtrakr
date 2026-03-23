import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X } from "lucide-react";

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
              {tag}
              <button type="button" onClick={() => removeTag(i)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({
    target_roles: [] as string[],
    locations: [] as string[],
    remote_preference: "remote_or_local",
    min_base_salary: 200000,
    compensation_notes: "",
    must_haves: [] as string[],
    dealbreakers: [] as string[],
    nice_to_haves: [] as string[],
    industries: [] as string[],
    skills: [] as string[],
    summary: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("job_search_profile")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setProfileId(data.id);
      setForm({
        target_roles: data.target_roles || [],
        locations: data.locations || [],
        remote_preference: data.remote_preference || "remote_or_local",
        min_base_salary: data.min_base_salary || 0,
        compensation_notes: data.compensation_notes || "",
        must_haves: data.must_haves || [],
        dealbreakers: data.dealbreakers || [],
        nice_to_haves: data.nice_to_haves || [],
        industries: data.industries || [],
        skills: data.skills || [],
        summary: data.summary || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profileId) {
        const { error } = await supabase
          .from("job_search_profile")
          .update({
            target_roles: form.target_roles,
            locations: form.locations,
            remote_preference: form.remote_preference,
            min_base_salary: form.min_base_salary,
            compensation_notes: form.compensation_notes,
            must_haves: form.must_haves,
            dealbreakers: form.dealbreakers,
            nice_to_haves: form.nice_to_haves,
            industries: form.industries,
            skills: form.skills,
            summary: form.summary,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("job_search_profile")
          .insert({
            target_roles: form.target_roles,
            locations: form.locations,
            remote_preference: form.remote_preference,
            min_base_salary: form.min_base_salary,
            compensation_notes: form.compensation_notes,
            must_haves: form.must_haves,
            dealbreakers: form.dealbreakers,
            nice_to_haves: form.nice_to_haves,
            industries: form.industries,
            skills: form.skills,
            summary: form.summary,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setProfileId(data.id);
      }
      toast({ title: "Profile saved!", description: "Your job search preferences have been updated." });
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Search Profile</h1>
          <p className="mt-1 text-muted-foreground">Manage your job search preferences, skills, and criteria</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </Button>
      </div>

      <div className="space-y-8">
        {/* Professional Summary */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Professional Summary</h2>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Brief professional summary..."
              rows={4}
            />
          </div>
        </section>

        {/* Target Roles */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Target Roles</h2>
          <div className="space-y-2">
            <Label>Roles you're targeting</Label>
            <TagInput value={form.target_roles} onChange={v => setForm(f => ({ ...f, target_roles: v }))} placeholder="e.g. VP of Product" />
          </div>
        </section>

        {/* Location & Remote */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Location Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred Locations</Label>
              <TagInput value={form.locations} onChange={v => setForm(f => ({ ...f, locations: v }))} placeholder="e.g. Ann Arbor, MI" />
            </div>
            <div className="space-y-2">
              <Label>Remote Preference</Label>
              <Select value={form.remote_preference} onValueChange={v => setForm(f => ({ ...f, remote_preference: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote_only">Remote Only</SelectItem>
                  <SelectItem value="remote_or_local">Remote or Local</SelectItem>
                  <SelectItem value="local_only">Local Only</SelectItem>
                  <SelectItem value="open">Open to Anything</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Compensation */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Compensation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Base Salary</Label>
              <Input
                type="number"
                value={form.min_base_salary}
                onChange={e => setForm(f => ({ ...f, min_base_salary: parseInt(e.target.value) || 0 }))}
                placeholder="200000"
              />
            </div>
            <div className="space-y-2">
              <Label>Compensation Notes</Label>
              <Input
                value={form.compensation_notes}
                onChange={e => setForm(f => ({ ...f, compensation_notes: e.target.value }))}
                placeholder="e.g. Must include equity"
              />
            </div>
          </div>
        </section>

        {/* Industries & Skills */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Industries & Skills</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Industries (in order of preference)</Label>
              <TagInput value={form.industries} onChange={v => setForm(f => ({ ...f, industries: v }))} placeholder="e.g. Life Sciences / Biotech" />
            </div>
            <div className="space-y-2">
              <Label>Key Skills</Label>
              <TagInput value={form.skills} onChange={v => setForm(f => ({ ...f, skills: v }))} placeholder="e.g. Product Strategy" />
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Requirements</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Must-Haves</Label>
              <TagInput value={form.must_haves} onChange={v => setForm(f => ({ ...f, must_haves: v }))} placeholder="e.g. Senior product leadership role" />
            </div>
            <div className="space-y-2">
              <Label>Nice-to-Haves</Label>
              <TagInput value={form.nice_to_haves} onChange={v => setForm(f => ({ ...f, nice_to_haves: v }))} placeholder="e.g. Life Sciences industry" />
            </div>
            <div className="space-y-2">
              <Label>Dealbreakers</Label>
              <TagInput value={form.dealbreakers} onChange={v => setForm(f => ({ ...f, dealbreakers: v }))} placeholder="e.g. No relocation" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
