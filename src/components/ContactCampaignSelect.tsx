import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import type { Campaign } from "@/types/jobTracker";

interface ContactCampaignSelectProps {
  campaigns: Campaign[];
  selectedCampaignIds: string[];
  onToggle: (campaignId: string) => void;
}

export default function ContactCampaignSelect({ campaigns, selectedCampaignIds, onToggle }: ContactCampaignSelectProps) {
  if (campaigns.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Megaphone className="h-3 w-3" />
          {selectedCampaignIds.length > 0 ? `${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? "s" : ""}` : "Campaigns"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">Assign to campaigns</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {campaigns.map(c => (
            <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
              <Checkbox checked={selectedCampaignIds.includes(c.id)} onCheckedChange={() => onToggle(c.id)} />
              <span className="truncate">{c.name}</span>
              <Badge variant="outline" className="text-[9px] capitalize ml-auto shrink-0">{c.type}</Badge>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
