import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { companiesMatch } from "@/stores/jobTrackerStore";
import { clusterHue } from "./clusterColor";
import type { Contact, Job, TargetCompany, ContactConnection, JobContact, RecommendationRequest } from "@/types/jobTracker";

export type NetworkLayoutMode = "radial" | "hierarchical" | "grid";

interface UseNetworkGraphParams {
  contacts: Contact[];
  jobs: Job[];
  targetCompanies: TargetCompany[];
  contactConnections: ContactConnection[];
  jobContacts: JobContact[];
  recommendationRequests: RecommendationRequest[];
  showJobs: boolean;
  focusCompany: string;
  focusContact: string;
  filterWarmth: string;
  filterRole: string;
  layoutMode?: NetworkLayoutMode;
  /** Optional explicit center node id for radial mode (overrides focus-derived center). */
  centerNodeId?: string | null;
}

/**
 * Radial cluster layout.
 *
 * Each company sits at the centre of its own cluster, with contacts and jobs
 * distributed evenly around it on a ring. Cluster centres are placed on a
 * larger outer ring (or packed in a grid for many clusters) so that text
 * never overlaps. Orphan nodes (no company) wrap on an inner ring at (0,0).
 */
function getLayout(nodes: Node[], edges: Edge[], companyNodeMap: Map<string, string[]>, mode: NetworkLayoutMode = "radial", centerNodeId: string | null = null) {
  const positions = new Map<string, { x: number; y: number }>();

  // Approximate visual footprint of each node type (width × height incl. labels)
  const NODE_W = { company: 120, child: 110 };
  const NODE_H = { company: 70, child: 90 };
  const LABEL_PAD = 24; // breathing room between adjacent labels

  const companyIds = new Set<string>();
  nodes.forEach(n => { if (n.type === "companyNode") companyIds.add(n.id); });

  const childOf = new Set<string>();
  companyNodeMap.forEach(children => children.forEach(c => childOf.add(c)));
  const orphans: string[] = [];
  nodes.forEach(n => {
    if (n.type !== "companyNode" && !childOf.has(n.id)) orphans.push(n.id);
  });

  // Sort companies by cluster size (largest first) for even visual weight
  const sortedCompanies = Array.from(companyIds).sort((a, b) => {
    const sa = companyNodeMap.get(a)?.length ?? 0;
    const sb = companyNodeMap.get(b)?.length ?? 0;
    return sb - sa;
  });

  // Cap children per ring so a single huge cluster doesn't blow up the layout.
  // Larger clusters wrap onto multiple concentric rings.
  const MAX_PER_RING = 18;
  const RING_GAP = 50; // gap between concentric rings within a cluster

  /** Single ring radius for `count` children placed evenly around it. */
  function singleRingRadius(count: number) {
    if (count <= 1) return 0;
    const chord = NODE_W.child + LABEL_PAD;
    const minByChord = chord / (2 * Math.sin(Math.PI / count));
    return Math.max(110, minByChord);
  }

  // Distribute children across concentric rings (inner rings smaller).
  function ringPlan(total: number): number[] {
    if (total <= 0) return [];
    const rings: number[] = [];
    let remaining = total;
    let idx = 0;
    while (remaining > 0) {
      const cap = Math.min(MAX_PER_RING, 6 + idx * 6);
      const take = Math.min(cap, remaining);
      rings.push(take);
      remaining -= take;
      idx++;
    }
    return rings;
  }

  // Compute radii for each concentric ring (cumulative outward).
  function ringRadii(plan: number[]): number[] {
    const radii: number[] = [];
    plan.forEach((c, i) => {
      const baseR = singleRingRadius(c);
      const prev = i === 0 ? 0 : radii[i - 1];
      radii.push(Math.max(baseR, prev + RING_GAP));
    });
    return radii;
  }

  // Cluster footprint = outermost ring radius + child node radius
  function clusterRadius(count: number) {
    const plan = ringPlan(count);
    if (plan.length === 0) return 0;
    const radii = ringRadii(plan);
    return radii[radii.length - 1] + Math.max(NODE_W.child, NODE_H.child) / 2;
  }

  // Place children for a cluster across one or more concentric rings.
  function placeChildren(cx: number, cy: number, children: string[]) {
    const plan = ringPlan(children.length);
    const radii = ringRadii(plan);
    let cursor = 0;
    plan.forEach((count, i) => {
      const r = radii[i];
      // Offset start angle slightly per ring so labels don't stack radially.
      const startAngle = Math.PI / 2 + (i % 2 === 0 ? 0 : Math.PI / count);
      for (let j = 0; j < count; j++) {
        const angle = startAngle + (2 * Math.PI * j) / count;
        const childId = children[cursor++];
        positions.set(childId, {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }
    });
  }

  const n = sortedCompanies.length;

  // -------- Hierarchical (top-down tree) --------
  if (mode === "hierarchical") {
    // Each company is a row root; children laid out as an arc/row below it.
    // Companies are arranged horizontally, sized by their child-row width.
    const COMPANY_GAP_Y = 220; // vertical gap company → children row
    const ROW_GAP = 140; // gap between successive child rows for big clusters
    const CHILD_GAP = NODE_W.child + LABEL_PAD;
    const COL_GAP = 80; // gap between adjacent companies
    const MAX_PER_ROW = 12; // wrap children onto multiple rows

    // Pre-compute footprint width per company so we can space them out.
    const widths = sortedCompanies.map(id => {
      const count = companyNodeMap.get(id)?.length ?? 0;
      const perRow = Math.min(MAX_PER_ROW, Math.max(1, count));
      return Math.max(NODE_W.company + 40, perRow * CHILD_GAP);
    });
    const totalWidth = widths.reduce((s, w) => s + w, 0) + Math.max(0, n - 1) * COL_GAP;
    let cursorX = -totalWidth / 2;
    sortedCompanies.forEach((compId, i) => {
      const w = widths[i];
      const cx = cursorX + w / 2;
      const cy = 0;
      positions.set(compId, { x: cx, y: cy });

      const children = companyNodeMap.get(compId) ?? [];
      const perRow = Math.min(MAX_PER_ROW, Math.max(1, children.length));
      children.forEach((childId, j) => {
        const row = Math.floor(j / perRow);
        const col = j % perRow;
        const rowCount = row === Math.floor((children.length - 1) / perRow)
          ? ((children.length - 1) % perRow) + 1
          : perRow;
        const x = cx + (col - (rowCount - 1) / 2) * CHILD_GAP;
        const y = cy + COMPANY_GAP_Y + row * ROW_GAP;
        positions.set(childId, { x, y });
      });
      cursorX += w + COL_GAP;
    });
  }
  // -------- Grid (uniform cells) --------
  else if (mode === "grid") {
    const footprints = sortedCompanies.map(id => 2 * (clusterRadius(companyNodeMap.get(id)?.length ?? 0) + LABEL_PAD));
    const sorted = [...footprints].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 260;
    const cellSize = Math.max(260, Math.min(420, median));
    const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n))));
    sortedCompanies.forEach((compId, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const cx = (col - (cols - 1) / 2) * cellSize;
      const rows = Math.ceil(n / cols);
      const cy = (row - (rows - 1) / 2) * cellSize;
      positions.set(compId, { x: cx, y: cy });
      const children = companyNodeMap.get(compId) ?? [];
      placeChildren(cx, cy, children);
    });
  }
  // -------- Radial (default) — single outer ring with auto-fallback to grid for huge graphs --------
  else {
    // If a center node is specified (from search/focus), build a focus-centered radial layout:
    // center node at origin, 1-hop neighbors on inner ring, 2-hop on outer ring, others on far ring.
    if (centerNodeId && nodes.some(n => n.id === centerNodeId)) {
      const adjacency = new Map<string, Set<string>>();
      nodes.forEach(n => adjacency.set(n.id, new Set()));
      edges.forEach(e => {
        adjacency.get(e.source)?.add(e.target);
        adjacency.get(e.target)?.add(e.source);
      });

      // BFS to assign hop distances from center
      const hop = new Map<string, number>();
      hop.set(centerNodeId, 0);
      const queue: string[] = [centerNodeId];
      while (queue.length) {
        const cur = queue.shift()!;
        const d = hop.get(cur)!;
        adjacency.get(cur)?.forEach(nbr => {
          if (!hop.has(nbr)) {
            hop.set(nbr, d + 1);
            queue.push(nbr);
          }
        });
      }

      // Group by hop level (cap at 3; everything further goes on outer ring)
      const rings: string[][] = [[], [], [], []];
      nodes.forEach(n => {
        if (n.id === centerNodeId) return;
        const d = hop.get(n.id);
        const lvl = d == null ? 3 : Math.min(3, d);
        rings[lvl].push(n.id);
      });

      // Place center
      positions.set(centerNodeId, { x: 0, y: 0 });

      // Place each ring at increasing radius, evenly spaced
      const BASE_R = 220;
      const RING_STEP = 200;
      for (let lvl = 1; lvl <= 3; lvl++) {
        const ids = rings[lvl];
        if (ids.length === 0) continue;
        const chord = NODE_W.child + LABEL_PAD;
        const minR = ids.length === 1 ? 0 : chord / (2 * Math.sin(Math.PI / ids.length));
        const r = Math.max(BASE_R + (lvl - 1) * RING_STEP, minR);
        ids.forEach((id, i) => {
          const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
          positions.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        });
      }
    } else {
      const USE_GRID_THRESHOLD = 12;
      if (n > USE_GRID_THRESHOLD) {
        // Large datasets: radial single ring becomes unreadable → fall back to grid.
        const footprints = sortedCompanies.map(id => 2 * (clusterRadius(companyNodeMap.get(id)?.length ?? 0) + LABEL_PAD));
        const sorted = [...footprints].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 260;
        const cellSize = Math.max(260, Math.min(420, median));
        const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
        sortedCompanies.forEach((compId, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const cx = (col - (cols - 1) / 2) * cellSize;
          const rows = Math.ceil(n / cols);
          const cy = (row - (rows - 1) / 2) * cellSize;
          positions.set(compId, { x: cx, y: cy });
          const children = companyNodeMap.get(compId) ?? [];
          placeChildren(cx, cy, children);
        });
      } else {
        const totalDemand = sortedCompanies.reduce(
          (sum, id) => sum + 2 * (clusterRadius(companyNodeMap.get(id)?.length ?? 0) + LABEL_PAD),
          0,
        );
        const outerRadius = Math.max(360, totalDemand / (2 * Math.PI) + 80);
        sortedCompanies.forEach((compId, i) => {
          const cx = n <= 1 ? 0 : Math.cos((2 * Math.PI * i) / n - Math.PI / 2) * outerRadius;
          const cy = n <= 1 ? 0 : Math.sin((2 * Math.PI * i) / n - Math.PI / 2) * outerRadius;
          positions.set(compId, { x: cx, y: cy });
          const children = companyNodeMap.get(compId) ?? [];
          placeChildren(cx, cy, children);
        });
      }
    }
  }

  // Orphans on a small inner ring at (0,0), spaced enough to read labels
  if (orphans.length > 0) {
    const orphanRadius = orphans.length === 1
      ? 0
      : Math.max(120, (NODE_W.child + LABEL_PAD) / (2 * Math.sin(Math.PI / orphans.length)));
    orphans.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / orphans.length - Math.PI / 2;
      positions.set(id, {
        x: Math.cos(angle) * orphanRadius,
        y: Math.sin(angle) * orphanRadius,
      });
    });
  }

  return nodes.map(node => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const isCompany = node.type === "companyNode";
    // xyflow positions the top-left corner — offset to centre the node visually
    const w = isCompany ? NODE_W.company : NODE_W.child;
    const h = isCompany ? NODE_H.company : NODE_H.child;
    return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

export function useNetworkGraph(params: UseNetworkGraphParams) {
  const { contacts, jobs, targetCompanies, contactConnections, jobContacts, recommendationRequests, showJobs, focusCompany, focusContact, filterWarmth, filterRole, layoutMode = "radial" } = params;

  return useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const companyNodes = new Map<string, string>(); // normalized name → node id
    const companyChildMap = new Map<string, string[]>(); // company node id → child node ids

    // Helper: get or create company node
    function getCompanyNodeId(companyName: string) {
      const normalized = companyName.toLowerCase().trim();
      if (companyNodes.has(normalized)) return companyNodes.get(normalized)!;
      const id = `company-${normalized}`;
      const tc = targetCompanies.find(t => companiesMatch(t.name, companyName));
      companyNodes.set(normalized, id);
      nodes.push({
        id,
        type: "companyNode",
        position: { x: 0, y: 0 },
        data: {
          label: tc?.name || companyName,
          isTarget: !!tc,
          priority: tc?.priority,
          targetId: tc?.id,
          dimmed: false,
          clusterHue: clusterHue(companyName),
        },
      });
      return id;
    }

    // Build contact nodes
    contacts.forEach(c => {
      const recReqs = recommendationRequests.filter(r => r.contactId === c.id);
      nodes.push({
        id: `contact-${c.id}`,
        type: "contactNode",
        position: { x: 0, y: 0 },
        data: {
          label: c.name,
          company: c.company,
          warmth: c.relationshipWarmth,
          networkRole: c.networkRole,
          hasReferral: recReqs.some(r => r.status === "pending" || r.status === "received"),
          lastContactedAt: c.lastContactedAt,
          role: c.role,
          id: c.id,
          dimmed: false,
          clusterHue: clusterHue(c.company),
        },
      });

      // Contact → Company edge
      if (c.company) {
        const compId = getCompanyNodeId(c.company);
        const contactNodeId = `contact-${c.id}`;
        if (!companyChildMap.has(compId)) companyChildMap.set(compId, []);
        companyChildMap.get(compId)!.push(contactNodeId);
        edges.push({
          id: `works-${c.id}`,
          source: contactNodeId,
          target: compId,
          type: "default",
          style: { strokeDasharray: "5,5", stroke: "hsl(var(--muted-foreground))" },
          label: c.role || "works at",
          data: { edgeType: "works_at", role: c.role },
        });
      }
    });

    // Contact ↔ Contact connections
    contactConnections.forEach(cc => {
      edges.push({
        id: `conn-${cc.id}`,
        source: `contact-${cc.contactId1}`,
        target: `contact-${cc.contactId2}`,
        type: "default",
        style: { stroke: "hsl(var(--muted-foreground))" },
        label: cc.relationshipLabel?.replace(/_/g, " ") || cc.connectionType,
        data: { edgeType: "knows", label: cc.relationshipLabel, date: cc.createdAt },
      });
    });

    // Job nodes
    if (showJobs) {
      jobs.forEach(j => {
        nodes.push({
          id: `job-${j.id}`,
          type: "jobNode",
          position: { x: 0, y: 0 },
          data: {
            label: j.title,
            company: j.company,
            status: j.status,
            fitScore: j.fitScore,
            appliedDate: j.appliedDate,
            id: j.id,
            dimmed: false,
            clusterHue: clusterHue(j.company),
          },
        });

        // Job → Company
        if (j.company) {
          const compId = getCompanyNodeId(j.company);
          const jobNodeId = `job-${j.id}`;
          if (!companyChildMap.has(compId)) companyChildMap.set(compId, []);
          companyChildMap.get(compId)!.push(jobNodeId);
          edges.push({
            id: `jobco-${j.id}`,
            source: `job-${j.id}`,
            target: compId,
            type: "default",
            style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 },
            data: { edgeType: "job_at_company" },
          });
        }
      });

      // Contact ↔ Job links
      jobContacts.forEach(jc => {
        const contact = contacts.find(c => c.id === jc.contactId);
        edges.push({
          id: `jclink-${jc.id}`,
          source: `contact-${jc.contactId}`,
          target: `job-${jc.jobId}`,
          type: "default",
          style: { strokeDasharray: "3,3", stroke: "hsl(var(--info))" },
          label: contact?.networkRole?.replace(/_/g, " ") || "linked",
          data: { edgeType: "linked_to_job" },
        });
      });

      // Referral path highlighting
      recommendationRequests.forEach(rr => {
        const contactJobs = jobContacts.filter(jc => jc.contactId === rr.contactId);
        contactJobs.forEach(jc => {
          edges.push({
            id: `ref-${rr.id}-${jc.jobId}`,
            source: `contact-${rr.contactId}`,
            target: `job-${jc.jobId}`,
            type: "default",
            animated: true,
            style: { stroke: "hsl(var(--success))", strokeWidth: 2 },
            label: `referral: ${rr.status}`,
            data: { edgeType: "referral_path", status: rr.status },
          });
        });
      });
    }

    // Apply filters — determine which nodes match
    let hasAnyFilter = false;
    const matchingNodeIds = new Set<string>();

    // Focus company: include company + 1-hop neighbors
    if (focusCompany && focusCompany !== "all") {
      hasAnyFilter = true;
      const compId = companyNodes.get(focusCompany.toLowerCase().trim());
      if (compId) {
        matchingNodeIds.add(compId);
        edges.forEach(e => {
          if (e.source === compId) matchingNodeIds.add(e.target);
          if (e.target === compId) matchingNodeIds.add(e.source);
        });
      }
    }

    // Focus contact: include contact + 1-hop neighbors
    if (focusContact && focusContact !== "all") {
      hasAnyFilter = true;
      const cId = `contact-${focusContact}`;
      const contactSet = new Set<string>([cId]);
      edges.forEach(e => {
        if (e.source === cId) contactSet.add(e.target);
        if (e.target === cId) contactSet.add(e.source);
      });
      // Intersect with prior filter if present, else seed
      if (matchingNodeIds.size > 0) {
        const inter = new Set<string>();
        contactSet.forEach(id => { if (matchingNodeIds.has(id)) inter.add(id); });
        matchingNodeIds.clear();
        inter.forEach(id => matchingNodeIds.add(id));
      } else {
        contactSet.forEach(id => matchingNodeIds.add(id));
      }
    }

    // Filter by warmth — narrow to matching contacts (and their neighbors)
    if (filterWarmth && filterWarmth !== "all") {
      hasAnyFilter = true;
      const warmthMatches = new Set<string>();
      contacts.forEach(c => {
        if (c.relationshipWarmth === filterWarmth) {
          const id = `contact-${c.id}`;
          warmthMatches.add(id);
          edges.forEach(e => {
            if (e.source === id) warmthMatches.add(e.target);
            if (e.target === id) warmthMatches.add(e.source);
          });
        }
      });
      if (matchingNodeIds.size > 0) {
        const inter = new Set<string>();
        warmthMatches.forEach(id => { if (matchingNodeIds.has(id)) inter.add(id); });
        matchingNodeIds.clear();
        inter.forEach(id => matchingNodeIds.add(id));
      } else {
        warmthMatches.forEach(id => matchingNodeIds.add(id));
      }
    }

    // Filter by role — narrow to matching contacts (and their neighbors)
    if (filterRole && filterRole !== "all") {
      hasAnyFilter = true;
      const roleMatches = new Set<string>();
      contacts.forEach(c => {
        if (c.networkRole === filterRole) {
          const id = `contact-${c.id}`;
          roleMatches.add(id);
          edges.forEach(e => {
            if (e.source === id) roleMatches.add(e.target);
            if (e.target === id) roleMatches.add(e.source);
          });
        }
      });
      if (matchingNodeIds.size > 0) {
        const inter = new Set<string>();
        roleMatches.forEach(id => { if (matchingNodeIds.has(id)) inter.add(id); });
        matchingNodeIds.clear();
        inter.forEach(id => matchingNodeIds.add(id));
      } else {
        roleMatches.forEach(id => matchingNodeIds.add(id));
      }
    }

    // Apply dimming to nodes and edges
    if (hasAnyFilter) {
      nodes.forEach(n => {
        (n.data as any).dimmed = !matchingNodeIds.has(n.id);
      });
      edges.forEach(e => {
        const active = matchingNodeIds.has(e.source) && matchingNodeIds.has(e.target);
        if (!active) {
          e.style = { ...(e.style || {}), opacity: 0.1 };
        }
      });
    }

    // Layout
    const layoutNodes = getLayout(nodes, edges, companyChildMap, layoutMode);

    return { nodes: layoutNodes, edges };
  }, [contacts, jobs, targetCompanies, contactConnections, jobContacts, recommendationRequests, showJobs, focusCompany, focusContact, filterWarmth, filterRole, layoutMode]);
}
