import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
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
import { useNetworkGraph } from "@/components/network/useNetworkGraph";
import ConnectionDialog from "@/components/network/ConnectionDialog";
import NetworkSearch from "@/components/network/NetworkSearch";
import type { Contact, Job, TargetCompany, ContactConnection, JobContact, RecommendationRequest, ContactActivity } from "@/types/jobTracker";

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
  const [focusCompany, setFocusCompany] = useState("all");
  const [focusContact, setFocusContact] = useState("all");
  const [filterWarmth, setFilterWarmth] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [showJobs, setShowJobs] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{ type: "contact" | "company" | "job"; data: any } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode; visible: boolean }>({ x: 0, y: 0, content: null, visible: false });
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string; sourceName: string; targetName: string } | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);

  // Sync graph data when filters change
  const prevGraphRef = useRef(graphData);
  if (prevGraphRef.current !== graphData) {
    prevGraphRef.current = graphData;
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }

  // Apply highlight to nodes
  const nodesWithHighlight = highlightedNodeId
    ? nodes.map(n => n.id === highlightedNodeId ? { ...n, data: { ...n.data, highlighted: true } } : { ...n, data: { ...n.data, highlighted: false } })
    : nodes;

  const handleReset = () => {
    setFocusCompany("all");
    setFocusContact("all");
    setFilterWarmth("all");
    setFilterRole("all");
    setShowJobs(true);
    setSelectedNode(null);
  };

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Network Map</h1>
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
        onToggleJobs={() => setShowJobs(!showJobs)}
        onReset={handleReset}
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
            edges={edges}
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
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(var(--border))" gap={24} />
            <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === "contactNode") return "hsl(var(--primary))";
                if (n.type === "companyNode") return "hsl(var(--warning))";
                return "hsl(var(--info))";
              }}
              className="!bg-card !border-border"
            />
            <div className="absolute top-3 left-3 z-10">
              <NetworkSearch
                contacts={props.contacts}
                companies={props.contacts.map(c => c.company)}
                jobs={props.jobs}
                onHighlightNode={setHighlightedNodeId}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-primary bg-card" /> Contact
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded border-2 border-warning bg-card" /> Company
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rotate-45 rounded-sm border-2 border-info bg-card" /> Job
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
