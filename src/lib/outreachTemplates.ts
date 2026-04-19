import type { NetworkRole } from "@/types/jobTracker";

export interface TemplateContext {
  contactName?: string;
  contactFirstName?: string;
  targetCompany?: string;
  jobTitle?: string;
  yourName?: string;
}

export interface OutreachTemplate {
  id: string;
  label: string;
  body: string;
}

const PLACEHOLDER = (ctx: TemplateContext, key: keyof TemplateContext, fallback: string) =>
  ctx[key]?.toString().trim() || fallback;

function fill(template: string, ctx: TemplateContext): string {
  return template
    .replaceAll("{name}", PLACEHOLDER(ctx, "contactName", "[name]"))
    .replaceAll("{first_name}", PLACEHOLDER(ctx, "contactFirstName", PLACEHOLDER(ctx, "contactName", "[name]").split(" ")[0]))
    .replaceAll("{company}", PLACEHOLDER(ctx, "targetCompany", "[company]"))
    .replaceAll("{role}", PLACEHOLDER(ctx, "jobTitle", "[role]"))
    .replaceAll("{your_name}", PLACEHOLDER(ctx, "yourName", "[your name]"));
}

const RAW_TEMPLATES: Record<NetworkRole, OutreachTemplate[]> = {
  booster: [
    {
      id: "booster-referral-ask",
      label: "Ask for referral",
      body: `Hi {first_name},\n\nI just applied to the {role} role at {company} and noticed you're on the team. Would you be open to referring me internally? Happy to send my resume and a quick blurb you can forward.\n\nThanks so much,\n{your_name}`,
    },
    {
      id: "booster-intro-hm",
      label: "Ask for intro to hiring manager",
      body: `Hi {first_name},\n\nI'm exploring the {role} opportunity at {company}. Would you be willing to intro me to the hiring manager? Happy to share more on my background first.\n\nAppreciate it,\n{your_name}`,
    },
  ],
  connector: [
    {
      id: "connector-who-you-know",
      label: "Ask who they know at company",
      body: `Hi {first_name},\n\nI'm exploring opportunities at {company}. I noticed you may know folks there — would you be open to making an intro to anyone in product or engineering? No pressure if not.\n\nThanks,\n{your_name}`,
    },
  ],
  recruiter_internal: [
    {
      id: "recruiter-internal-submit",
      label: "Submit for role",
      body: `Hi {first_name},\n\nI'd love to be considered for the {role} role at {company}. Resume attached. Happy to share more on fit if helpful.\n\nThanks,\n{your_name}`,
    },
  ],
  recruiter_external: [
    {
      id: "recruiter-external-share-criteria",
      label: "Share search criteria",
      body: `Hi {first_name},\n\nQuick update on my search — I'm focused on {role} opportunities and open to introductions. Latest resume attached. Let me know what you're working on.\n\nThanks,\n{your_name}`,
    },
  ],
  hiring_manager: [
    {
      id: "hm-direct-pitch",
      label: "Direct pitch",
      body: `Hi {first_name},\n\nI saw the {role} opening at {company} and wanted to reach out directly. Quick context on why I think I'd be a strong fit: [1-2 sentences]. Open to a 15-min chat?\n\nBest,\n{your_name}`,
    },
  ],
  mentor_peer: [
    {
      id: "mentor-checkin",
      label: "Periodic check-in",
      body: `Hi {first_name},\n\nIt's been a bit — wanted to check in and share a quick update on my search. Would love to hear what you're up to as well. Coffee soon?\n\n{your_name}`,
    },
  ],
};

export function getOutreachTemplates(role: NetworkRole | undefined | null, ctx: TemplateContext): OutreachTemplate[] {
  if (!role) return [];
  const templates = RAW_TEMPLATES[role] || [];
  return templates.map(t => ({ ...t, body: fill(t.body, ctx) }));
}

export function getPrimaryAction(role: NetworkRole | undefined | null): string | null {
  switch (role) {
    case "booster": return "Ask for referral";
    case "connector": return "Ask who they know";
    case "recruiter_internal": return "Submit for role";
    case "recruiter_external": return "Share search criteria";
    case "hiring_manager": return "Direct pitch";
    case "mentor_peer": return "Periodic check-in";
    default: return null;
  }
}
