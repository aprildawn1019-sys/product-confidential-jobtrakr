import { ShieldOff, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useDisableLinkedInAvatars,
  setDisableLinkedInAvatars,
} from "@/lib/privacyPrefs";

/**
 * Settings → Privacy panel.
 *
 * Today this hosts a single toggle: disable LinkedIn avatar proxying.
 * When ON, the app stops requesting any LinkedIn-derived photo (raw CDN
 * or our own cached copy) and renders initials for every contact instead.
 * The preference is local to this device — it doesn't change what's
 * stored in the database, just what's rendered.
 */
export default function PrivacySettings() {
  const disableLinkedInAvatars = useDisableLinkedInAvatars();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldOff className="h-4 w-4 text-primary" />
            Avatars & images
          </CardTitle>
          <CardDescription>
            Control what third-party content is rendered alongside your contacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4">
            <div className="space-y-1">
              <Label
                htmlFor="disable-linkedin-avatars"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Hide LinkedIn profile photos
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                When enabled, the app will not request LinkedIn-hosted profile
                photos or cached copies from our image proxy. Contacts will
                show initials only. Existing photo URLs remain stored on the
                contact and will reappear if you turn this off.
              </p>
            </div>
            <Switch
              id="disable-linkedin-avatars"
              checked={disableLinkedInAvatars}
              onCheckedChange={setDisableLinkedInAvatars}
              aria-label="Hide LinkedIn profile photos"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              This setting only affects rendering on this device. It does not
              delete cached avatars from storage. To purge cached photos for a
              specific contact, edit the contact and clear the photo URL.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
