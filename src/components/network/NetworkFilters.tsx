import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Eye, EyeOff, Download } from "lucide-react";
import { NETWORK_ROLES } from "@/types/jobTracker";
import type { Contact, TargetCompany } from "@/types/jobTracker";

interface NetworkFiltersProps {
  contacts: Contact[];
  targetCompanies: TargetCompany[];
  focusCompany: string;
  onFocusCompanyChange: (v: string) => void;
  focusContact: string;
  onFocusContactChange: (v: string) => void;
  filterWarmth: string;
  onFilterWarmthChange: (v: string) => void;
  filterRole: string;
  onFilterRoleChange: (v: string) => void;
  showJobs: boolean;
  onToggleJobs: () => void;
  onReset: () => void;
  matchingContactCount: number;
  totalContactCount: number;
  isFiltered: boolean;
  onExport: () => void;
}

export default function NetworkFilters(props: NetworkFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={props.focusCompany} onValueChange={props.onFocusCompanyChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Focus company..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {props.targetCompanies.map(tc => (
            <SelectItem key={tc.id} value={tc.name}>{tc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.focusContact} onValueChange={props.onFocusContactChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Focus contact..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Contacts</SelectItem>
          {props.contacts.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.filterWarmth} onValueChange={props.onFilterWarmthChange}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Warmth..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warmth</SelectItem>
          <SelectItem value="hot">🔥 Hot</SelectItem>
          <SelectItem value="warm">🌤️ Warm</SelectItem>
          <SelectItem value="cold">❄️ Cold</SelectItem>
          <SelectItem value="champion">🏆 Champion</SelectItem>
        </SelectContent>
      </Select>

      <Select value={props.filterRole} onValueChange={props.onFilterRoleChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Role..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {NETWORK_ROLES.map(r => (
            <SelectItem key={r.value} value={r.value}>{r.emoji} {r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={props.onToggleJobs}>
        {props.showJobs ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        Jobs
      </Button>

      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={props.onReset}>
        <RotateCcw className="h-3 w-3" /> Reset
      </Button>

      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={props.onExport}>
        <Download className="h-3 w-3" /> Export PNG
      </Button>

      <Badge variant={props.isFiltered ? "default" : "secondary"} className="h-7 text-xs font-medium ml-auto">
        {props.isFiltered
          ? `${props.matchingContactCount} of ${props.totalContactCount} contacts`
          : `${props.totalContactCount} contacts`}
      </Badge>
    </div>
  );
}
