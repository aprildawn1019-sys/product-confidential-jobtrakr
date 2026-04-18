import { useState, useMemo, useRef, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchResult {
  nodeId: string;
  label: string;
  type: "contact" | "company" | "job";
  subtitle?: string;
}

interface NetworkSearchProps {
  contacts: { id: string; name: string; company: string }[];
  companies: string[];
  jobs: { id: string; title: string; company: string }[];
  onHighlightNode?: (nodeId: string | null) => void;
  /** Called whenever the search query changes so the parent can filter visible nodes. */
  onQueryChange?: (query: string) => void;
}

export default function NetworkSearch({ contacts, companies, jobs, onHighlightNode, onQueryChange }: NetworkSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setCenter, getNodes } = useReactFlow();

  // Notify parent on query change so it can filter the graph in real time.
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const c of contacts) {
      if (c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)) {
        out.push({ nodeId: `contact-${c.id}`, label: c.name, type: "contact", subtitle: c.company });
      }
      if (out.length >= 8) break;
    }

    if (out.length < 8) {
      const seen = new Set<string>();
      for (const name of companies) {
        const key = name.toLowerCase().trim();
        if (!seen.has(key) && key.includes(q)) {
          seen.add(key);
          out.push({ nodeId: `company-${key}`, label: name, type: "company" });
        }
        if (out.length >= 8) break;
      }
    }

    if (out.length < 8) {
      for (const j of jobs) {
        if (j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)) {
          out.push({ nodeId: `job-${j.id}`, label: j.title, type: "job", subtitle: j.company });
        }
        if (out.length >= 8) break;
      }
    }

    return out;
  }, [query, contacts, companies, jobs]);

  const handleSelect = (result: SearchResult) => {
    const allNodes = getNodes();
    const node = allNodes.find(n => n.id === result.nodeId);
    if (node && node.position) {
      setCenter(node.position.x + 50, node.position.y + 30, { zoom: 1.5, duration: 600 });
    }
    onHighlightNode?.(result.nodeId);
    setTimeout(() => onHighlightNode?.(null), 4600);
    setQuery("");
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeIcon = (type: string) => {
    if (type === "contact") return "👤";
    if (type === "company") return "🏢";
    return "💼";
  };

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search nodes..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          className="pl-9 pr-8 h-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-8"
            onClick={() => { setQuery(""); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.nodeId}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => handleSelect(r)}
            >
              <span>{typeIcon(r.type)}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{r.label}</p>
                {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
}
