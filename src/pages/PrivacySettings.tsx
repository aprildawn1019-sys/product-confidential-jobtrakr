import { ShieldOff, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useDisableLinkedInAvatars,
  setDisableLinkedInAvatars,
  useUseAvatarProxy,
  setUseAvatarProxy,
} from "@/lib/privacyPrefs";

/**
 * Settings → Privacy panel.
 *
 * Hosts two related toggles:
 *  1. "Hide LinkedIn profile photos" — display-side suppression. Stops
 *     rendering any LinkedIn-derived photo and shows initials instead.
 *  2. "Route LinkedIn avatars through proxy" — import-side behavior.
 *     When ON (default) newly imported contacts get their photo cached
 *     in our storage bucket. When OFF the raw LinkedIn URL is stored
 *     directly on the contact (faster import, but the browser may 403).
 *
 * Both prefs are local to the device — they don't change what's stored
 * in the database, just what the UI requests / what the importer caches.
 */
export default function PrivacySettings() {
  const disableLinkedInAvatars = useDisableLinkedInAvatars();
  const useAvatarProxy = useUseAvatarProxy();

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Import & caching
          </CardTitle>
          <CardDescription>
            Choose how LinkedIn profile photos are fetched when you add a contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4">
            <div className="space-y-1">
              <Label
                htmlFor="use-avatar-proxy"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Route LinkedIn avatars through our proxy
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                Recommended. When enabled, profile photos pulled during a
                LinkedIn import are downloaded by our edge function and cached
                in your account's storage so they always render reliably.
                When disabled, the raw LinkedIn image URL is stored directly
                on the contact — your browser will fetch it from LinkedIn's
                CDN, which often blocks third-party display.
              </p>
            </div>
            <Switch
              id="use-avatar-proxy"
              checked={useAvatarProxy}
              onCheckedChange={setUseAvatarProxy}
              aria-label="Route LinkedIn avatars through our proxy"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Affects only contacts imported after you change this setting.
              Existing avatar URLs are not modified. Use the
              "Refresh avatar" button on a contact to re-import a photo with
              the current setting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
