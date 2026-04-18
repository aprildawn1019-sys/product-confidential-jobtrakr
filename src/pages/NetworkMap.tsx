import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeMouseHandler,
  type OnConnect,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ContactNode from "@/components/network/ContactNode";
import CompanyNode from "@/components/network/CompanyNode";
import JobNode from "@/components/network/JobNode";
import NetworkFilters from "@/components/network/NetworkFilters";
import NetworkDetailPanel from "@/components/network/NetworkDetailPanel";
import NetworkTooltip from "@/components/network/NetworkTooltip";
import { useNetworkGraph, type NetworkLayoutMode } from "@/components/network/useNetworkGraph";
import ConnectionDialog from "@/components/network/ConnectionDialog";
import NetworkSearch from "@/components/network/NetworkSearch";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import type { Contact, Job, TargetCompany, ContactConnection, JobContact, RecommendationRequest, ContactActivity } from "@/types/jobTracker";
import HelpHint from "@/components/help/HelpHint";

const nodeTypes = {
  contactNode: ContactNode,
  companyNode: CompanyNode,
  jobNode: JobNode,
};

interface NetworkMapProps {
  contacts: Contact[];
  jobs: Job[];
  targetCompanies: TargetCompany[];
  contactConnections: ContactConnection[];
  jobContacts: JobContact[];
  recommendationRequests: RecommendationRequest[];
  contactActivities: ContactActivity[];
  getConnectionsForContact: (id: string) => (ContactConnection & { contact?: Contact })[];
  getRecommendationRequestsForContact: (id: string) => RecommendationRequest[];
  getActivitiesForContact: (id: string) => ContactActivity[];
  getContactsForJob: (jobId: string) => Contact[];
  getJobsForContact: (contactId: string) => Job[];
  onAddConnection: (contactId1: string, contactId2: string, type?: string, notes?: string, relationshipLabel?: string) => void;
}

function NetworkMapInner(props: NetworkMapProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-backed filter state — short keys for cleaner URLs
  const focusCompany = searchParams.get("co") ?? "all";
  const focusContact = searchParams.get("ct") ?? "all";
  const filterWarmth = searchParams.get("w") ?? "all";
  const filterRole = searchParams.get("r") ?? "all";
  const showJobs = searchParams.get("jobs") !== "0"; // default true
  const hideDimmed = searchParams.get("hd") === "1"; // default false
  const layoutMode: NetworkLayoutMode = (() => {
    const v = searchParams.get("layout");
    return v === "focus" ? "focus" : "overview";
  })();

  const updateParam = useCallback((key: string, value: string, defaultValue: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFocusCompany = useCallback((v: string) => updateParam("co", v, "all"), [updateParam]);
  const setFocusContact = useCallback((v: string) => updateParam("ct", v, "all"), [updateParam]);
  const setFilterWarmth = useCallback((v: string) => updateParam("w", v, "all"), [updateParam]);
  const setFilterRole = useCallback((v: string) => updateParam("r", v, "all"), [updateParam]);
  const toggleShowJobs = useCallback(() => updateParam("jobs", showJobs ? "0" : "1", "1"), [updateParam, showJobs]);
  const toggleHideDimmed = useCallback(() => updateParam("hd", hideDimmed ? "0" : "1", "0"), [updateParam, hideDimmed]);
  const setLayoutMode = useCallback((m: NetworkLayoutMode) => updateParam("layout", m, "overview"), [updateParam]);

  const [selectedNode, setSelectedNode] = useState<{ type: "contact" | "company" | "job"; data: any; nodeId: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode; visible: boolean }>({ x: 0, y: 0, content: null, visible: false });
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string; sourceName: string; targetName: string } | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualCenterId, setManualCenterId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string; label: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-compute search-derived center node id (best match) so radial layout can re-center on it.
  const searchCenterId = useMemo<string | null>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    // Prefer exact contact match, then company, then job; fall back to first partial.
    const contact = props.contacts.find(c => c.name.toLowerCase() === q)
      ?? props.contacts.find(c => c.name.toLowerCase().includes(q));
    if (contact) return `contact-${contact.id}`;
    const companyName = props.contacts.map(c => c.company).find(name => name?.toLowerCase().trim() === q)
      ?? props.contacts.map(c => c.company).find(name => name?.toLowerCase().includes(q));
    if (companyName) return `company-${companyName.toLowerCase().trim()}`;
    const job = props.jobs.find(j => j.title.toLowerCase().includes(q));
    if (job) return `job-${job.id}`;
    return null;
  }, [searchQuery, props.contacts, props.jobs]);

  const graphData = useNetworkGraph({
    contacts: props.contacts,
    jobs: props.jobs,
    targetCompanies: props.targetCompanies,
    contactConnections: props.contactConnections,
    jobContacts: props.jobContacts,
    recommendationRequests: props.recommendationRequests,
    showJobs,
    focusCompany,
    focusContact,
    filterWarmth,
    filterRole,
    layoutMode,
    centerNodeId: searchCenterId,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);
  const { fitView } = useReactFlow();

  const isFiltered = focusCompany !== "all" || focusContact !== "all" || filterWarmth !== "all" || filterRole !== "all";

  // Sync graph data when filters change
  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

  // Compute IDs of nodes that match the active search query (across contacts, companies, jobs).
  // Empty query → null (means "no search filter active").
  const searchMatchedIds = useMemo<Set<string> | null>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    const ids = new Set<string>();
    for (const c of props.contacts) {
      if (c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)) {
        ids.add(`contact-${c.id}`);
      }
    }
    const seenCompanies = new Set<string>();
    for (const c of props.contacts) {
      const key = c.company.toLowerCase().trim();
      if (!seenCompanies.has(key) && key.includes(q)) {
        seenCompanies.add(key);
        ids.add(`company-${key}`);
      }
    }
    for (const j of props.jobs) {
      if (j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)) {
        ids.add(`job-${j.id}`);
      }
    }
    return ids;
  }, [searchQuery, props.contacts, props.jobs]);

  const isSearching = searchMatchedIds !== null && searchMatchedIds.size > 0;

  // Auto-fit viewport to matching nodes when filters or search change
  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    let matchingIds: string[] | undefined;
    if (isSearching) {
      matchingIds = Array.from(searchMatchedIds!);
    } else if (isFiltered) {
      matchingIds = graphData.nodes.filter(n => !(n.data as any).dimmed).map(n => n.id);
    }
    if (matchingIds && matchingIds.length === 0) return;
    const t = window.setTimeout(() => {
      fitView({
        nodes: matchingIds?.map(id => ({ id })),
        duration: 600,
        padding: 0.25,
        maxZoom: isSearching ? 1.5 : 1.2,
        minZoom: 0.01,
      });
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, isFiltered, hideDimmed, isSearching, searchQuery]);

  // Apply search filter first, then dimmed-hide, then highlight.
  let visibleNodes = nodes;
  if (isSearching) {
    visibleNodes = visibleNodes.filter(n => searchMatchedIds!.has(n.id));
  } else if (hideDimmed && isFiltered) {
    visibleNodes = visibleNodes.filter(n => !(n.data as any).dimmed);
  }
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = (isSearching || (hideDimmed && isFiltered))
    ? edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
    : edges;
  const nodesWithHighlight = highlightedNodeId
    ? visibleNodes.map(n => n.id === highlightedNodeId ? { ...n, data: { ...n.data, highlighted: true } } : { ...n, data: { ...n.data, highlighted: false } })
    : visibleNodes;

  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSelectedNode(null);
  }, [setSearchParams]);

  const handleExport = useCallback(async () => {
    const viewport = containerRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    const flowEl = containerRef.current?.querySelector(".react-flow") as HTMLElement | null;
    const target = flowEl ?? viewport;
    if (!target) {
      toast.error("Could not find network map to export");
      return;
    }
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: "hsl(var(--card))",
        pixelRatio: 2,
        filter: (node) => {
          // Exclude controls, minimap, search bar, attribution from export
          if (!(node instanceof HTMLElement)) return true;
          const cls = node.className?.toString() ?? "";
          if (cls.includes("react-flow__minimap")) return false;
          if (cls.includes("react-flow__controls")) return false;
          if (cls.includes("react-flow__attribution")) return false;
          if (node.dataset?.networkExportExclude === "true") return false;
          return true;
        },
      });
      const link = document.createElement("a");
      link.download = `network-map-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Network map exported");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export network map");
    }
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const d = node.data as any;
    if (node.type === "contactNode") {
      const contact = props.contacts.find(c => c.id === d.id);
      setSelectedNode({ type: "contact", data: { ...d, ...contact } });
    } else if (node.type === "companyNode") {
      setSelectedNode({ type: "company", data: d });
    } else if (node.type === "jobNode") {
      const job = props.jobs.find(j => j.id === d.id);
      setSelectedNode({ type: "job", data: { ...d, ...job } });
    }
  }, [props.contacts, props.jobs]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    const d = node.data as any;
    if (node.type === "contactNode") navigate(`/contacts?highlight=${d.id}`);
    else if (node.type === "jobNode") navigate(`/jobs/${d.id}`);
    else if (node.type === "companyNode" && d.targetId) navigate("/target-companies");
  }, [navigate]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
    const d = node.data as any;
    const rect = containerRef.current?.getBoundingClientRect();
    const x = (_event as unknown as MouseEvent).clientX - (rect?.left || 0);
    const y = (_event as unknown as MouseEvent).clientY - (rect?.top || 0);

    let content: React.ReactNode = null;
    if (node.type === "contactNode") {
      content = (
        <div className="space-y-0.5">
          <p className="font-semibold">{d.label}</p>
          <p>{d.role} at {d.company}</p>
          {d.networkRole && <p className="capitalize">{d.networkRole.replace(/_/g, " ")}</p>}
          {d.warmth && <p className="capitalize">Warmth: {d.warmth}</p>}
          {d.lastContactedAt && <p>Last contact: {d.lastContactedAt}</p>}
          {d.hasReferral && <p className="text-success">Has pending referral</p>}
        </div>
      );
    } else if (node.type === "companyNode") {
      const contactCount = props.contacts.filter(c => c.company?.toLowerCase().trim() === (d.label as string)?.toLowerCase().trim()).length;
      const jobCount = props.jobs.filter(j => j.company?.toLowerCase().trim() === (d.label as string)?.toLowerCase().trim()).length;
      content = (
        <div className="space-y-0.5">
          <p className="font-semibold">{d.label}</p>
          {d.isTarget && <p>★ {d.priority} target</p>}
          <p>{contactCount} contacts · {jobCount} jobs</p>
        </div>
      );
    } else if (node.type === "jobNode") {
      content = (
        <div className="space-y-0.5">
          <p className="font-semibold">{d.label}</p>
          <p>{d.company}</p>
          <p className="capitalize">Status: {d.status}</p>
          {d.fitScore && <p>Fit: {d.fitScore}/5</p>}
          {d.appliedDate && <p>Applied: {d.appliedDate}</p>}
        </div>
      );
    }
    setTooltip({ x, y, content, visible: true });
  }, [props.contacts, props.jobs]);

  const onNodeMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    const sourceId = connection.source;
    const targetId = connection.target;
    if (!sourceId || !targetId) return;
    // Only allow contact-to-contact connections
    if (!sourceId.startsWith("contact-") || !targetId.startsWith("contact-")) return;
    const sId = sourceId.replace("contact-", "");
    const tId = targetId.replace("contact-", "");
    if (sId === tId) return;
    // Check if connection already exists
    const exists = props.contactConnections.some(
      cc => (cc.contactId1 === sId && cc.contactId2 === tId) || (cc.contactId1 === tId && cc.contactId2 === sId)
    );
    if (exists) return;
    const sourceName = props.contacts.find(c => c.id === sId)?.name || "Contact";
    const targetName = props.contacts.find(c => c.id === tId)?.name || "Contact";
    setPendingConnection({ sourceId: sId, targetId: tId, sourceName, targetName });
  }, [props.contacts, props.contactConnections]);

  const handleConfirmConnection = useCallback((relationshipLabel: string) => {
    if (!pendingConnection) return;
    props.onAddConnection(pendingConnection.sourceId, pendingConnection.targetId, "linkedin", "", relationshipLabel);
    setPendingConnection(null);
  }, [pendingConnection, props]);


  // Detail panel data
  const detailActivities = selectedNode?.type === "contact" ? props.getActivitiesForContact(selectedNode.data.id) : [];
  const detailConnections = selectedNode?.type === "contact" ? props.getConnectionsForContact(selectedNode.data.id) : [];
  const detailRecommendations = selectedNode?.type === "contact" ? props.getRecommendationRequestsForContact(selectedNode.data.id) : [];
  const detailLinkedJobs = selectedNode?.type === "contact"
    ? props.getJobsForContact(selectedNode.data.id)
    : selectedNode?.type === "company"
      ? props.jobs.filter(j => j.company?.toLowerCase().trim() === selectedNode.data.label?.toLowerCase().trim())
      : [];
  const detailLinkedContacts = selectedNode?.type === "job"
    ? props.getContactsForJob(selectedNode.data.id)
    : selectedNode?.type === "company"
      ? props.contacts.filter(c => c.company?.toLowerCase().trim() === selectedNode.data.label?.toLowerCase().trim())
      : [];

  const isEmpty = props.contacts.length === 0;

  return (
    <div className="space-y-4" data-tour="page-network">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
          Network Map
          <HelpHint articleId="network-map" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize your professional network, trace referral paths, and find connections to target companies.</p>
      </div>

      <NetworkFilters
        contacts={props.contacts}
        targetCompanies={props.targetCompanies}
        focusCompany={focusCompany}
        onFocusCompanyChange={setFocusCompany}
        focusContact={focusContact}
        onFocusContactChange={setFocusContact}
        filterWarmth={filterWarmth}
        onFilterWarmthChange={setFilterWarmth}
        filterRole={filterRole}
        onFilterRoleChange={setFilterRole}
        showJobs={showJobs}
        onToggleJobs={toggleShowJobs}
        hideDimmed={hideDimmed}
        onToggleHideDimmed={toggleHideDimmed}
        onReset={handleReset}
        matchingContactCount={graphData.nodes.filter(n => n.type === "contactNode" && !(n.data as any).dimmed).length}
        totalContactCount={props.contacts.length}
        isFiltered={isFiltered}
        onExport={handleExport}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      />

      <div ref={containerRef} className="relative rounded-xl border border-border bg-card overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No connections yet</p>
              <p className="text-sm">Add contacts in the Connections page to see your network map.</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodesWithHighlight}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onPaneClick={onPaneClick}
            fitView
            minZoom={0.01}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(var(--border))" gap={24} />
            <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
            <div className="absolute top-3 left-3 z-10" data-network-export-exclude="true">
              <NetworkSearch
                contacts={props.contacts}
                companies={props.contacts.map(c => c.company)}
                jobs={props.jobs}
                onHighlightNode={setHighlightedNodeId}
                onQueryChange={setSearchQuery}
              />
            </div>
          </ReactFlow>
        )}

        <NetworkTooltip {...tooltip} />

        {selectedNode && (
          <NetworkDetailPanel
            type={selectedNode.type}
            data={selectedNode.data}
            targetCompanies={props.targetCompanies}
            activities={detailActivities}
            connections={detailConnections}
            recommendations={detailRecommendations}
            linkedJobs={detailLinkedJobs}
            linkedContacts={detailLinkedContacts}
            onClose={() => setSelectedNode(null)}
            onNavigate={(path) => navigate(path)}
          />
        )}

        <ConnectionDialog
          open={!!pendingConnection}
          sourceName={pendingConnection?.sourceName || ""}
          targetName={pendingConnection?.targetName || ""}
          onConfirm={handleConfirmConnection}
          onCancel={() => setPendingConnection(null)}
        />
      </div>

      {/* Legend — swatches mirror the actual node shapes */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-muted-foreground bg-card" />
          Contact <span className="text-[10px] text-muted-foreground/80">(border = warmth)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3.5 rounded-lg border-2 border-warning bg-card" />
          Company <span className="text-[10px] text-muted-foreground/80">(border = priority)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4">
            <span className="block w-3 h-3 rotate-45 border-2 border-info bg-card" style={{ borderRadius: 2 }} />
          </span>
          Job <span className="text-[10px] text-muted-foreground/80">(border = status)</span>
        </div>
        <span className="text-border">|</span>
        <span>Click node for details · Double-click to navigate · Drag between contacts to connect · Scroll to zoom</span>
      </div>
    </div>
  );
}

export default function NetworkMap(props: NetworkMapProps) {
  return (
    <ReactFlowProvider>
      <NetworkMapInner {...props} />
    </ReactFlowProvider>
  );
}
