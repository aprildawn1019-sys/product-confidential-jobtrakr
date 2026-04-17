import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, GitMerge, Calendar } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import MergePreviewDialog from "./MergePreviewDialog";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { TargetCompany, Job, Contact } from "@/types/jobTracker";

interface DuplicateCompaniesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: TargetCompany[][];
  jobs: Job[];
  contacts: Contact[];
  onMerge: (
    primaryId: string,
    duplicateIds: string[],
    mergedFields: Partial<TargetCompany>,
    duplicateNames: string[],
  ) => Promise<void>;
}

export default function DuplicateCompaniesDialog({
  open, onOpenChange, clusters, jobs, contacts, onMerge,
}: DuplicateCompaniesDialogProps) {
  const [activeCluster, setActiveCluster] = useState<TargetCompany[] | null>(null);

  const getCounts = (name: string) => {
    const j = jobs.filter(x => companiesMatch(x.company, name)).length;
    const c = contacts.filter(x => companiesMatch(x.company, name)).length;
    return { j, c };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Potential duplicate companies</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Review each cluster below. Merging will combine the records, re-link related jobs and contacts, and delete the duplicates.
          </p>

          <div className="space-y-3 mt-2">
            {clusters.map((cluster, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">Cluster {idx + 1}</h3>
                    <p className="text-xs text-muted-foreground">{cluster.length} likely-duplicate records</p>
                  </div>
                  <Button size="sm" onClick={() => setActiveCluster(cluster)} className="gap-1.5">
                    <GitMerge className="h-3.5 w-3.5" /> Merge
                  </Button>
                </div>
                <div className="space-y-2">
                  {cluster.map(c => {
                    const counts = getCounts(c.name);
                    return (
                      <div key={c.id} className="flex items-center gap-3 text-sm border-l-2 border-border pl-3 py-1">
                        <CompanyAvatar company={c.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{c.priority}</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{c.status}</Badge>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{counts.j}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{counts.c}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {activeCluster && (
        <MergePreviewDialog
          open={!!activeCluster}
          onOpenChange={(o) => { if (!o) setActiveCluster(null); }}
          cluster={activeCluster}
          jobs={jobs}
          contacts={contacts}
          onConfirm={async (primaryId, duplicateIds, mergedFields, duplicateNames) => {
            await onMerge(primaryId, duplicateIds, mergedFields, duplicateNames);
            setActiveCluster(null);
          }}
        />
      )}
    </>
  );
}
