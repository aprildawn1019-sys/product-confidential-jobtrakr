export interface Snapshot {
  id: string;
  job_id: string | null;
  skills: string[];
  captured_at: string;
  source: string | null;
}

export interface ProfileSkills {
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  tools_platforms: string[];
  certifications: string[];
  target_roles: string[];
}

export interface RankedSkill {
  skill: string;
  label: string;
  count: number;
  pct: number;
}

const overrides: Record<string, string> = {
  "p&l": "P&L", "saas": "SaaS", "ai": "AI", "sql": "SQL", "css": "CSS",
  "html": "HTML", "api": "API", "apis": "APIs", "ui": "UI", "ux": "UX",
  "ui/ux": "UI/UX", "kpi": "KPI", "kpis": "KPIs", "roi": "ROI",
  "okr": "OKR", "okrs": "OKRs", "crm": "CRM", "b2b": "B2B", "b2c": "B2C",
  "aws": "AWS", "gcp": "GCP", "ci/cd": "CI/CD", "sdk": "SDK", "sdks": "SDKs",
  "plg": "PLG", "mvp": "MVP", "pm": "PM", "pmo": "PMO", "qa": "QA",
  "seo": "SEO", "sem": "SEM", "erp": "ERP", "etl": "ETL", "ml": "ML",
  "nlp": "NLP", "llm": "LLM", "llms": "LLMs", "devops": "DevOps",
  "devsecops": "DevSecOps", "graphql": "GraphQL", "nosql": "NoSQL",
  "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
  "dynamodb": "DynamoDB", "json": "JSON", "yaml": "YAML", "csv": "CSV",
  "rest": "REST", "oauth": "OAuth", "sso": "SSO", "rbac": "RBAC",
  "gdpr": "GDPR", "hipaa": "HIPAA", "soc": "SOC", "iso": "ISO",
  "vpc": "VPC", "dns": "DNS", "cdn": "CDN", "tcp": "TCP", "http": "HTTP",
  "https": "HTTPS", "ssh": "SSH", "ssl": "SSL", "tls": "TLS",
  "ios": "iOS", "macos": "macOS", "iot": "IoT",
  "cto": "CTO", "ceo": "CEO", "cfo": "CFO", "coo": "COO",
  "a/b": "A/B", "pr": "PR", "nps": "NPS", "cac": "CAC", "ltv": "LTV",
  "arpu": "ARPU", "arr": "ARR", "mrr": "MRR", "tam": "TAM",
};

const acronymSet = new Set(Object.keys(overrides));
const smallWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "as", "vs"]);

export function formatSkillLabel(skill: string): string {
  if (overrides[skill]) return overrides[skill];

  return skill.split(/(\s+|[-/&])/).map((part, i) => {
    const lower = part.toLowerCase();
    if (overrides[lower]) return overrides[lower];
    if (/^\s+$/.test(part) || /^[-/&]$/.test(part)) return part;
    if (lower.length >= 2 && lower.length <= 5 && acronymSet.has(lower)) return overrides[lower];
    if (i > 0 && smallWords.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join("");
}

export const TREND_LINE_COLORS = [
  "hsl(var(--primary))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];
