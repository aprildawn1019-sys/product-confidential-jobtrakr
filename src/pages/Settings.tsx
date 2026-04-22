import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Settings as SettingsIcon, UserCog, FileSpreadsheet, ShieldOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfileEditor from "@/pages/ProfileEditor";
import Reports from "@/pages/Reports";
import PrivacySettings from "@/pages/PrivacySettings";

const TABS = [
  { value: "profile", label: "Search Profile", icon: UserCog },
  { value: "privacy", label: "Privacy", icon: ShieldOff },
  { value: "data-export", label: "Data & Export", icon: FileSpreadsheet },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function Settings() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const active: TabValue = (TABS.some((t) => t.value === tab) ? (tab as TabValue) : "profile");

  // Normalize URL: /settings → /settings/profile
  useEffect(() => {
    if (!tab) navigate("/settings/profile", { replace: true });
  }, [tab, navigate]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <SettingsIcon className="h-3.5 w-3.5" />
          Settings
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1">
          {TABS.find((t) => t.value === active)?.label}
        </h1>
      </div>

      <Tabs value={active} onValueChange={(v) => navigate(`/settings/${v}`)}>
        <TabsList>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileEditor />
        </TabsContent>
        <TabsContent value="privacy" className="mt-6">
          <PrivacySettings />
        </TabsContent>
        <TabsContent value="data-export" className="mt-6">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
