import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Contact, Job, TargetCompany, ContactConnection, JobContact, RecommendationRequest } from "@/types/jobTracker";

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
}

/**
 * Radial cluster layout.
 *
 * Each company sits at the centre of its own cluster, with contacts and jobs
 * distributed evenly around it on a ring. Cluster centres are placed on a
 * larger outer ring (or packed in a grid for many clusters) so that text
 * never overlaps. Orphan nodes (no company) wrap on an inner ring at (0,0).
 */
function getLayout(nodes: Node[], _edges: Edge[], companyNodeMap: Map<string, string[]>) {
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

  /**
   * Child ring radius: must be large enough that adjacent children, placed at
   * 2π/count spacing, don't visually collide. Required radius ≈ chord/2sin(π/n)
   * where chord = node width + padding.
   */
  function childRingRadius(count: number) {
    if (count <= 1) return 0;
    const chord = NODE_W.child + LABEL_PAD;
    const minByChord = chord / (2 * Math.sin(Math.PI / count));
    // Floor + gentle linear growth so even small clusters look airy
    return Math.max(110, minByChord, 90 + count * 6);
  }

  // Cluster footprint = child ring + child node radius (so labels clear the centre)
  function clusterRadius(count: number) {
    return childRingRadius(count) + Math.max(NODE_W.child, NODE_H.child) / 2;
  }

  const n = sortedCompanies.length;

  // For large numbers of clusters, a single outer ring becomes enormous and
  // unreadable. Switch to a grid layout once we exceed a threshold so the
  // viewport stays compact and fitView can show everything at once.
  const USE_GRID_THRESHOLD = 12;

  if (n > USE_GRID_THRESHOLD) {
    // Pack clusters in a grid sized by largest cluster footprint
    const maxClusterDiameter = Math.max(
      ...sortedCompanies.map(id => 2 * (clusterRadius(companyNodeMap.get(id)?.length ?? 0) + LABEL_PAD)),
    );
    const cellSize = Math.max(260, maxClusterDiameter);
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
    sortedCompanies.forEach((compId, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // Center the grid around (0,0)
      const cx = (col - (cols - 1) / 2) * cellSize;
      const rows = Math.ceil(n / cols);
      const cy = (row - (rows - 1) / 2) * cellSize;
      positions.set(compId, { x: cx, y: cy });

      const children = companyNodeMap.get(compId) ?? [];
      const r = childRingRadius(children.length);
      const startAngle = Math.PI / 2;
      children.forEach((childId, j) => {
        const angle = startAngle + (2 * Math.PI * j) / Math.max(1, children.length);
        positions.set(childId, {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      });
    });
  } else {
    // Outer ring sized so each cluster's footprint fits along its arc
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
      const r = childRingRadius(children.length);
      // Start angle offset so a single child sits below centre
      const startAngle = Math.PI / 2;
      children.forEach((childId, j) => {
        const angle = startAngle + (2 * Math.PI * j) / Math.max(1, children.length);
        positions.set(childId, {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      });
    });
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
  const { contacts, jobs, targetCompanies, contactConnections, jobContacts, recommendationRequests, showJobs, focusCompany, focusContact, filterWarmth, filterRole } = params;

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
    const layoutNodes = getLayout(nodes, edges, companyChildMap);

    return { nodes: layoutNodes, edges };
  }, [contacts, jobs, targetCompanies, contactConnections, jobContacts, recommendationRequests, showJobs, focusCompany, focusContact, filterWarmth, filterRole]);
}
