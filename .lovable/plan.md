

## Network Map — Visual Cluster Visualization

The current Network Map is a flat list of cards grouped by company. The goal is to replace it with an interactive, visual node-graph where organizations appear as clusters and contacts appear as nodes with connection lines between them.

### Approach

Use an **SVG-based force-directed layout** built with plain React + `useEffect` (no heavy graph library needed for this scale). Each organization becomes a visual cluster with a colored boundary, and contacts are rendered as circular nodes inside. Lines connect nodes that have explicit `contactConnection` records.

### Layout

```text
┌─────────────────────────────────────────────┐
│  Network Map        Stats row (unchanged)   │
├─────────────────────────────────────────────┤
│                                             │
│    ┌─ Google ──────────┐                    │
│    │  (Alice)──(Bob)   │                    │
│    │     \             │   ┌─ Meta ──┐      │
│    │    (Carol)        │───│ (Dan)   │      │
│    └───────────────────┘   └─────────┘      │
│                                             │
│  Hover node → tooltip with name/role/links  │
│  Click node → detail panel (right side)     │
└─────────────────────────────────────────────┘
```

### Implementation Details

**File: `src/pages/NetworkMap.tsx`** — rewrite

1. **Force simulation** — A custom `useEffect` runs a simple iterative force layout:
   - Nodes repel each other (charge force)
   - Connected nodes attract (spring force)  
   - Nodes in the same org cluster toward a shared centroid
   - Runs ~100 iterations on mount, updates positions in state

2. **SVG rendering**:
   - Org clusters drawn as rounded `<rect>` or `<ellipse>` backgrounds with semi-transparent org color (deterministic color from org name hash)
   - Contact nodes as `<circle>` with initials `<text>` inside
   - Connection edges as `<line>` elements between connected nodes
   - Cross-org connections rendered as dashed lines

3. **Interactivity**:
   - **Hover** a node → tooltip shows name, role, company, LinkedIn link
   - **Click** a node → side panel or highlighted detail card below the graph
   - **Zoom/pan** via SVG `viewBox` manipulation with mouse wheel and drag

4. **Stats row** remains above the graph (unchanged)

5. **Empty state** remains unchanged

6. **Responsive**: SVG fills available width, fixed height (~500px), viewBox scales

### No database or store changes needed — purely a UI rewrite of the existing component using the same props.

