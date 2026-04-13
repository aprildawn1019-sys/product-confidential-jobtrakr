import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RELATIONSHIP_LABELS } from "@/types/jobTracker";

interface ConnectionDialogProps {
  open: boolean;
  sourceName: string;
  targetName: string;
  onConfirm: (relationshipLabel: string) => void;
  onCancel: () => void;
}

export default function ConnectionDialog({ open, sourceName, targetName, onConfirm, onCancel }: ConnectionDialogProps) {
  const [label, setLabel] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Connection</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Connect <strong>{sourceName}</strong> → <strong>{targetName}</strong>
        </p>
        <Select value={label} onValueChange={setLabel}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select relationship..." />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_LABELS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => { onConfirm(label); setLabel(""); }} disabled={!label}>
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
