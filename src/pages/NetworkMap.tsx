import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Users, Building2, Link2, Linkedin, Mail, Phone, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Contact, ContactConnection } from "@/types/jobTracker";

interface NetworkMapProps {
  contacts: Contact[];
  contactConnections: ContactConnection[];
}

interface NodePos {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  org: string;
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

function hashColorBg(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsla(${h}, 55%, 55%, 0.08)`;
}

function hashColorBorder(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsla(${h}, 55%, 55%, 0.3)`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function NetworkMap({ contacts, contactConnections }: NetworkMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [positions, setPositions] = useState<NodePos[]>([]);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 500 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const orgGroups = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    contacts.forEach(c => {
      const key = c.company.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [contacts]);

  const adjacency = useMemo(() => {
    const adj: Record<string, Set<string>> = {};
    contactConnections.forEach(cc => {
      if (!adj[cc.contactId1]) adj[cc.contactId1] = new Set();
      if (!adj[cc.contactId2]) adj[cc.contactId2] = new Set();
      adj[cc.contactId1].add(cc.contactId2);
      adj[cc.contactId2].add(cc.contactId1);
    });
    return adj;
  }, [contactConnections]);

  // Force simulation
  useEffect(() => {
    if (contacts.length === 0) return;

    const W = 900;
    const H = 500;

    // Assign initial positions based on org clusters
    const orgCentroids: Record<string, { cx: number; cy: number }> = {};
    const cols = Math.ceil(Math.sqrt(orgGroups.length));
    orgGroups.forEach(([key], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spacingX = W / (cols + 1);
      const spacingY = H / (Math.ceil(orgGroups.length / cols) + 1);
      orgCentroids[key] = {
        cx: spacingX * (col + 1),
        cy: spacingY * (row + 1),
      };
    });

    const nodes: NodePos[] = contacts.map((c, i) => {
      const orgKey = c.company.toLowerCase();
      const centroid = orgCentroids[orgKey] || { cx: W / 2, cy: H / 2 };
      const angle = (i * 2.399) ; // golden angle spread
      const r = 30 + Math.random() * 20;
      return {
        id: c.id,
        x: centroid.cx + Math.cos(angle) * r,
        y: centroid.cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        org: orgKey,
      };
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const ITERATIONS = 150;
    const REPULSION = 2000;
    const SPRING_LENGTH = 80;
    const SPRING_K = 0.05;
    const CLUSTER_K = 0.08;
    const DAMPING = 0.85;
    const PADDING = 40;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring attraction for connections
      contactConnections.forEach(cc => {
        const a = nodeMap.get(cc.contactId1);
        const b = nodeMap.get(cc.contactId2);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - SPRING_LENGTH;
        const force = SPRING_K * displacement;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // Cluster attraction toward org centroid
      nodes.forEach(n => {
        const centroid = orgCentroids[n.org];
        if (!centroid) return;
        n.vx += (centroid.cx - n.x) * CLUSTER_K;
        n.vy += (centroid.cy - n.y) * CLUSTER_K;
      });

      // Apply velocity with damping and boundary constraints
      nodes.forEach(n => {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(PADDING, Math.min(W - PADDING, n.x));
        n.y = Math.max(PADDING, Math.min(H - PADDING, n.y));
      });
    }

    setPositions([...nodes]);
    setViewBox({ x: 0, y: 0, w: W, h: H });
  }, [contacts, contactConnections, orgGroups]);

  // Compute cluster boundaries
  const clusterBounds = useMemo(() => {
    if (positions.length === 0) return [];
    const orgMap: Record<string, NodePos[]> = {};
    positions.forEach(p => {
      if (!orgMap[p.org]) orgMap[p.org] = [];
      orgMap[p.org].push(p);
    });
    return Object.entries(orgMap).map(([org, nodes]) => {
      const pad = 35;
      const minX = Math.min(...nodes.map(n => n.x)) - pad;
      const minY = Math.min(...nodes.map(n => n.y)) - pad;
      const maxX = Math.max(...nodes.map(n => n.x)) + pad;
      const maxY = Math.max(...nodes.map(n => n.y)) + pad;
      const displayName = contacts.find(c => c.company.toLowerCase() === org)?.company || org;
      return { org, displayName, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    });
  }, [positions, contacts]);

  const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const posMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest(".network-node")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    setViewBox(v => ({ ...v, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(v => {
      const newW = v.w * factor;
      const newH = v.h * factor;
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  }, []);

  const selectedContact = selectedNode ? contactMap.get(selectedNode) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Network Map</h1>
        <p className="mt-1 text-muted-foreground">
          {contacts.length} contacts across {orgGroups.length} organizations · {contactConnections.length} connections
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Total Contacts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{orgGroups.length}</p>
          <p className="text-xs text-muted-foreground">Organizations</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Link2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{contactConnections.length}</p>
          <p className="text-xs text-muted-foreground">Connections</p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mb-3" />
          <p className="text-lg font-medium">No contacts yet</p>
          <p className="text-sm">Add contacts to see your network map</p>
        </div>
      ) : (
        <div className="flex gap-4" ref={containerRef}>
          {/* SVG Graph */}
          <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className="w-full"
              style={{ height: 500, cursor: isPanning ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* Cluster backgrounds */}
              {clusterBounds.map(cb => (
                <g key={cb.org}>
                  <rect
                    x={cb.x}
                    y={cb.y}
                    width={cb.w}
                    height={cb.h}
                    rx={16}
                    ry={16}
                    fill={hashColorBg(cb.org)}
                    stroke={hashColorBorder(cb.org)}
                    strokeWidth={1.5}
                  />
                  <text
                    x={cb.x + 10}
                    y={cb.y + 16}
                    fontSize={11}
                    fontWeight={600}
                    fill={hashColor(cb.org)}
                    className="select-none"
                    style={{ textTransform: "capitalize" }}
                  >
                    {cb.displayName}
                  </text>
                </g>
              ))}

              {/* Connection edges */}
              {contactConnections.map(cc => {
                const a = posMap.get(cc.contactId1);
                const b = posMap.get(cc.contactId2);
                if (!a || !b) return null;
                const sameOrg = a.org === b.org;
                return (
                  <line
                    key={`${cc.contactId1}-${cc.contactId2}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                    strokeDasharray={sameOrg ? "none" : "4 3"}
                  />
                );
              })}

              {/* Nodes */}
              {positions.map(pos => {
                const contact = contactMap.get(pos.id);
                if (!contact) return null;
                const isHovered = hoveredNode === pos.id;
                const isSelected = selectedNode === pos.id;
                const isConnected = selectedNode && adjacency[selectedNode]?.has(pos.id);
                const dimmed = selectedNode && !isSelected && !isConnected;
                const nodeColor = hashColor(pos.org);
                const r = isHovered || isSelected ? 22 : 18;

                return (
                  <g
                    key={pos.id}
                    className="network-node"
                    style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                    opacity={dimmed ? 0.25 : 1}
                    onMouseEnter={() => setHoveredNode(pos.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(prev => prev === pos.id ? null : pos.id);
                    }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={nodeColor}
                      stroke={isSelected ? "hsl(var(--primary))" : isHovered ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ transition: "r 0.15s, stroke-width 0.15s" }}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={700}
                      fill="white"
                      className="select-none pointer-events-none"
                    >
                      {getInitials(contact.name)}
                    </text>

                    {/* Tooltip on hover */}
                    {isHovered && !selectedNode && (
                      <foreignObject
                        x={pos.x + 24}
                        y={pos.y - 30}
                        width={180}
                        height={80}
                        className="pointer-events-none"
                      >
                        <div className="rounded-lg border border-border bg-popover p-2 shadow-lg text-popover-foreground text-xs">
                          <p className="font-semibold">{contact.name}</p>
                          <p className="text-muted-foreground">{contact.role}</p>
                          <p className="text-muted-foreground capitalize">{contact.company}</p>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
            <p className="text-[10px] text-muted-foreground text-center py-1">
              Scroll to zoom · Drag to pan · Click a node for details
            </p>
          </div>

          {/* Detail panel */}
          {selectedContact && (
            <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-4 space-y-3 self-start">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: hashColor(selectedContact.company.toLowerCase()) }}
                >
                  {getInitials(selectedContact.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{selectedContact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedContact.role}</p>
                </div>
              </div>

              <Badge variant="secondary" className="text-xs capitalize">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedContact.company}
              </Badge>

              <div className="space-y-1.5 text-xs">
                {selectedContact.email && (
                  <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Mail className="h-3 w-3" /> {selectedContact.email}
                  </a>
                )}
                {selectedContact.phone && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3" /> {selectedContact.phone}
                  </p>
                )}
                {selectedContact.linkedin && (
                  <a
                    href={`https://${selectedContact.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Linkedin className="h-3 w-3" /> LinkedIn
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              {/* Connected contacts */}
              {adjacency[selectedContact.id] && adjacency[selectedContact.id].size > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Connected to</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(adjacency[selectedContact.id]).map(cid => {
                      const c = contactMap.get(cid);
                      if (!c) return null;
                      const connType = contactConnections.find(
                        cc => (cc.contactId1 === selectedContact.id && cc.contactId2 === cid) ||
                              (cc.contactId1 === cid && cc.contactId2 === selectedContact.id)
                      )?.connectionType;
                      return (
                        <Badge
                          key={cid}
                          variant="outline"
                          className="text-[10px] cursor-pointer hover:bg-accent"
                          onClick={() => setSelectedNode(cid)}
                        >
                          {c.name.split(" ")[0]}
                          {connType && <span className="ml-0.5 opacity-60">({connType})</span>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedContact.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-foreground">{selectedContact.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
