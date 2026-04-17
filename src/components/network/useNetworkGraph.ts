import { useMemo } from "react";
import dagre from "dagre";
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

function getLayout(nodes: Node[], edges: Edge[], companyNodeMap: Map<string, string[]>, direction = "TB") {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 });

  nodes.forEach(n => {
    const isCompany = n.type === "companyNode";
    g.setNode(n.id, { width: isCompany ? 140 : 110, height: isCompany ? 60 : 70 });
  });

  // Group contact/job nodes under their company parent for clustering
  companyNodeMap.forEach((childIds, companyId) => {
    childIds.forEach(childId => {
      if (g.hasNode(childId) && g.hasNode(companyId)) {
        g.setParent(childId, companyId);
      }
    });
  });

  edges.forEach(e => {
    // Skip edges that go from child to its compound parent (dagre handles these internally)
    if (companyNodeMap.get(e.target)?.includes(e.source)) return;
    if (companyNodeMap.get(e.source)?.includes(e.target)) return;
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 60, y: pos.y - 40 } };
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
