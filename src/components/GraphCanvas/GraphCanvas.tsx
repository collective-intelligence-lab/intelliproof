import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ConnectionMode,
} from "reactflow";
import type {
  OnNodesChange,
  NodeProps,
  Node,
  Connection,
  Edge,
  OnEdgesChange,
  OnConnectStart,
  OnConnectEnd,
} from "reactflow";
import { useState, useCallback, useRef, useEffect } from "react";
import "reactflow/dist/style.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  createClaimNode,
  type ClaimNode,
  type ClaimType,
  type ClaimData,
} from "../../types/graph";
import type { ClaimEdge, EdgeType } from "../../types/edges";
import NodeProperties from "../NodeProperties/NodeProperties";
import CustomEdge from "../Edges/CustomEdge";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useRouter, useSearchParams } from 'next/navigation';
import { saveGraph, setCurrentGraph } from '../../store/slices/graphsSlice';

const CustomNode = ({ data, id }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local text when data changes from outside
  useEffect(() => {
    setLocalText(data.text);
  }, [data.text]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Only update if the text has actually changed
    if (localText !== data.text) {
      data.onChange?.(localText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setLocalText(data.text); // Reset to original text
      setIsEditing(false);
    }
    e.stopPropagation();
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      <div
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full flex items-center justify-center ${isEditing ? "nodrag" : ""
          }`}
        style={{ minHeight: "40px", minWidth: "100px" }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-center bg-transparent outline-none border-b border-gray-300 px-2"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="w-full text-center break-words min-h-[24px] px-2">
            {data.text || "Click to edit"}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </>
  );
};

const nodeTypes = {
  default: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const GraphCanvasInner = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const graphId = searchParams.get('id');

  const currentGraph = useSelector((state: RootState) => state.graphs.currentGraph as {
    id?: string;
    graph_name?: string;
    graph_data?: { nodes?: ClaimNode[]; edges?: ClaimEdge[] };
  } | null);
  const { profile } = useSelector((state: RootState) => state.user);
  const [title, setTitle] = useState(currentGraph?.graph_name || "Untitled Graph");
  const [isEditing, setIsEditing] = useState(false);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(true);
  const [nodes, setNodes] = useState<ClaimNode[]>([]);
  const [edges, setEdges] = useState<ClaimEdge[]>([]);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ClaimNode | null>(null);
  const [selectedEdgeType, setSelectedEdgeType] =
    useState<EdgeType>("supporting");
  const { project } = useReactFlow();
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandleType, setConnectingHandleType] = useState<
    "source" | "target" | null
  >(null);
  const [currentGraphId, setCurrentGraphId] = useState<string | undefined>(undefined);

  // Add effect to handle URL params
  useEffect(() => {
    if (graphId && !currentGraph?.id) {
      console.log('Graph ID from URL:', graphId);
      // If we have a graph ID in the URL but no current graph, try to load it
      dispatch(setCurrentGraph({ id: graphId }));
    }
  }, [graphId, currentGraph, dispatch]);

  // Load graph data into state when currentGraph changes
  useEffect(() => {
    if (currentGraph) {
      console.log('Loading graph data:', currentGraph); // Debug log

      // Set the title from the graph name
      if (currentGraph.graph_name) {
        console.log('Setting graph title to:', currentGraph.graph_name); // Debug log
        setTitle(currentGraph.graph_name);
      } else {
        console.warn('No graph name found in currentGraph:', currentGraph);
        setTitle("Untitled Graph");
      }

      // Ensure we set the graph ID first
      if (currentGraph.id) {
        console.log('Setting current graph ID:', currentGraph.id); // Debug log
        setCurrentGraphId(currentGraph.id);
      } else {
        console.error('No graph ID in currentGraph:', currentGraph);
      }

      // Transform nodes to include required ReactFlow properties
      const formattedNodes = (currentGraph.graph_data?.nodes || []).map(node => {
        // If node.data is undefined, fallback to node itself (for legacy data)
        const nodeData = node.data || node;
        return {
          id: node.id,
          type: 'default' as const,
          position: node.position,
          data: {
            text: nodeData.text || 'New Claim',
            type: nodeData.type || 'factual',
            author: nodeData.author,
            belief: nodeData.belief || 0.5,
            created_on: nodeData.created_on || new Date().toISOString(),
            onChange: (newText: string) => {
              handleNodeUpdate(node.id, {
                data: { ...nodeData, text: newText },
              });
            },
          },
          style: {
            backgroundColor: (nodeData.type === 'factual')
              ? '#4FD9BD'
              : (nodeData.type === 'value')
                ? '#7283D9'
                : '#FDD000',
          },
        };
      });

      // Transform edges to include required ReactFlow properties
      const formattedEdges = (currentGraph.graph_data?.edges || []).map(edge => {
        const edgeData = edge.data || edge;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'custom' as const,
          data: {
            edgeType: edgeData.edgeType || 'supporting',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: (edgeData.edgeType === 'supporting') ? '#22C55E' : '#EF4444',
          },
        };
      });

      console.log('Formatted nodes:', formattedNodes); // Debug log
      console.log('Formatted edges:', formattedEdges); // Debug log

      setNodes(formattedNodes);
      setEdges(formattedEdges);
    }
  }, [currentGraph]);

  const handleTitleChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  const addNode = (type: ClaimType) => {
    const newNode = {
      ...createClaimNode("New Claim", type),
      data: {
        ...createClaimNode("New Claim", type).data,
        author: profile?.email || "Anonymous",
        onChange: (newText: string) => {
          handleNodeUpdate(newNode.id, {
            data: { ...newNode.data, text: newText },
          });
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsAddNodeOpen(false);
  };

  const onNodesChange: OnNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as ClaimNode[]);
  };

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as ClaimEdge[]);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: ClaimEdge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: "custom",
        data: {
          edgeType: selectedEdgeType,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: selectedEdgeType === "supporting" ? "#22C55E" : "#EF4444",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds) as ClaimEdge[]);
    },
    [selectedEdgeType]
  );

  const onConnectStart: OnConnectStart = useCallback(
    (_, { nodeId, handleType }) => {
      setConnectingNodeId(nodeId);
      setConnectingHandleType(handleType);
    },
    []
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeId || !connectingHandleType) return;

      const targetIsPane = (event.target as Element).classList.contains(
        "react-flow__pane"
      );
      if (!targetIsPane) {
        setConnectingNodeId(null);
        setConnectingHandleType(null);
        return;
      }

      // Get the position where the drag ended
      const { top, left } = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect() || { top: 0, left: 0 };
      const position = project({
        x: (event as MouseEvent).clientX - left,
        y: (event as MouseEvent).clientY - top,
      });

      // Create the new node
      const newNode = {
        ...createClaimNode("New Claim", "factual"),
        position,
        data: {
          ...createClaimNode("New Claim", "factual").data,
          onChange: (newText: string) => {
            handleNodeUpdate(newNode.id, {
              data: { ...newNode.data, text: newText },
            });
          },
        },
      };

      // Create the edge between the nodes
      const newEdge: ClaimEdge = {
        id: `e${connectingNodeId}-${newNode.id}`,
        source:
          connectingHandleType === "source" ? connectingNodeId : newNode.id,
        target:
          connectingHandleType === "source" ? newNode.id : connectingNodeId,
        type: "custom",
        data: {
          edgeType: selectedEdgeType,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: selectedEdgeType === "supporting" ? "#22C55E" : "#EF4444",
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
      setConnectingNodeId(null);
      setConnectingHandleType(null);
    },
    [connectingNodeId, connectingHandleType, project, selectedEdgeType]
  );

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node as ClaimNode);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<ClaimNode>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            ...updates,
            data: {
              ...node.data,
              ...updates.data,
              onChange: (newText: string) => {
                handleNodeUpdate(nodeId, {
                  data: { ...node.data, text: newText },
                });
              },
            },
            style: {
              ...node.style,
              backgroundColor:
                updates.data?.type === "factual"
                  ? "#4FD9BD"
                  : updates.data?.type === "value"
                    ? "#7283D9"
                    : "#FDD000",
            },
          };
          if (selectedNode?.id === nodeId) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }
        return node;
      })
    );
  };

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    const claimEdge = edge as ClaimEdge;
    const newEdgeType: EdgeType =
      claimEdge.data.edgeType === "supporting" ? "attacking" : "supporting";

    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            data: {
              ...e.data,
              edgeType: newEdgeType,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: newEdgeType === "supporting" ? "#22C55E" : "#EF4444",
            },
          };
        }
        return e;
      })
    );
  };

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      // Delete all connected edges first
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      // Delete the node
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const handleSave = async () => {
    try {
      // Add debug logging
      console.log('Current graph ID:', currentGraphId);
      console.log('Current graph:', currentGraph);

      // Get the graph ID from either source
      const graphId = currentGraphId || currentGraph?.id;

      if (!graphId) {
        console.error('No graph ID found for saving');
        alert('Cannot save: No graph ID found. Please try refreshing the page.');
        return;
      }

      // Format the graph data according to the required structure
      const graphData = {
        nodes: nodes.map(node => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          author: node.data.author,
          belief: node.data.belief || 0.5,
          position: node.position,
          created_on: node.data.created_on || new Date().toISOString()
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.data.edgeType === 'supporting' ? 0.5 : -0.5
        }))
      };

      console.log('Saving graph with ID:', graphId);
      console.log('Graph data:', graphData);

      // Save the graph with the current ID
      const saveResult = await dispatch(saveGraph({
        id: graphId,
        graphData,
        graphName: title
      }) as any);

      console.log('Save result:', saveResult);

      if (saveResult.error) {
        throw new Error(saveResult.error);
      }

      // Navigate back to graph manager
      router.push('/graph-manager');
    } catch (error) {
      console.error('Error saving graph:', error);
      alert('Failed to save graph. Please try again.');
    }
  };

  return (
    <div className="w-full h-full relative font-josefin">
      <PanelGroup direction="horizontal">
        {/* Evidence Panel Container */}
        {isEvidencePanelOpen && (
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full bg-white border-r border-black flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-black flex justify-between items-center bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium tracking-wide uppercase">
                    Evidence
                  </h2>
                  <span className="text-base text-gray-500 font-medium">
                    (12)
                  </span>
                </div>
                <button
                  onClick={() => setIsEvidencePanelOpen(false)}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                  aria-label="Close evidence panel"
                >
                  <span className="text-lg">←</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search evidence..."
                    className="w-full px-4 py-2.5 bg-[#FAFAFA] rounded-md text-base outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Evidence Content */}
              <div className="flex-1 overflow-auto">
                <div className="p-4 flex flex-col gap-4">
                  {/* Placeholder Evidence Items */}
                  <div className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="text-base font-medium mb-2">
                      Evidence Title
                    </div>
                    <div className="text-base text-gray-500 line-clamp-2">
                      Brief preview of the evidence content that might span
                      multiple lines...
                    </div>
                  </div>
                  <div className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="text-base font-medium mb-2">
                      Another Evidence
                    </div>
                    <div className="text-base text-gray-500 line-clamp-2">
                      More evidence content preview text here...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {isEvidencePanelOpen && (
          <PanelResizeHandle className="w-1 hover:w-1.5 bg-black/10 hover:bg-black/20 transition-all cursor-col-resize" />
        )}

        {/* Graph Area */}
        <Panel>
          <div className="relative h-full">
            {/* Floating Top Left Navbar */}
            <div className="absolute top-6 left-6 z-10 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-5">
                {/* Logo */}
                <div className="w-10 h-10 bg-[#7283D9] rounded-md flex items-center justify-center text-white font-medium text-lg">
                  IP
                </div>

                {/* User Info */}
                {profile && (
                  <div className="text-sm text-gray-600">
                    {profile.first_name} {profile.last_name}
                  </div>
                )}

                {/* Editable Title */}
                <div className="min-w-[150px]">
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={handleTitleChange}
                      onBlur={() => setIsEditing(false)}
                      className="bg-transparent border-b border-gray-300 focus:border-[#7283D9] outline-none px-1 font-medium text-base"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setIsEditing(true)}
                      className="cursor-pointer hover:bg-gray-100 px-3 py-1.5 rounded text-base"
                    >
                      {title}
                    </span>
                  )}
                </div>

                {/* Add Node Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsAddNodeOpen(!isAddNodeOpen)}
                    className="px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <span className="text-base">Add Node</span>
                  </button>
                  {isAddNodeOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[140px] z-10">
                      <button
                        onClick={() => addNode("factual")}
                        className="w-full text-left px-4 py-2 hover:bg-[#4FD9BD] hover:bg-opacity-10 text-base transition-colors"
                      >
                        Factual
                      </button>
                      <button
                        onClick={() => addNode("value")}
                        className="w-full text-left px-4 py-2 hover:bg-[#7283D9] hover:bg-opacity-10 text-base transition-colors"
                      >
                        Value
                      </button>
                      <button
                        onClick={() => addNode("policy")}
                        className="w-full text-left px-4 py-2 hover:bg-[#FDD000] hover:bg-opacity-10 text-base transition-colors"
                      >
                        Policy
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete Node Button */}
                <button
                  onClick={handleDeleteNode}
                  disabled={!selectedNode}
                  className={`px-3 py-2 rounded-md transition-colors ${selectedNode
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  <span className="text-base">Delete Node</span>
                </button>

                {/* Edge Type Selector */}
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-500">Edge:</span>
                  <button
                    onClick={() => setSelectedEdgeType("supporting")}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedEdgeType === "supporting"
                      ? "bg-green-500 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                  >
                    Supporting
                  </button>
                  <button
                    onClick={() => setSelectedEdgeType("attacking")}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedEdgeType === "attacking"
                      ? "bg-red-500 text-white"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                  >
                    Attacking
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Top Right Navbar */}
            <div className="absolute top-6 right-6 z-10 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 hover:bg-gray-100 rounded-md transition-colors">
                  <span className="text-base text-gray-700">Share</span>
                </button>
                <button className="px-4 py-2 hover:bg-gray-100 rounded-md transition-colors">
                  <span className="text-base text-gray-700">Export</span>
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#7283D9] hover:bg-[#6274ca] text-white rounded-md transition-colors"
                >
                  <span className="text-base">Save</span>
                </button>
              </div>
            </div>

            {/* Expand Button - Show when panel is closed */}
            {!isEvidencePanelOpen && (
              <button
                onClick={() => setIsEvidencePanelOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 h-24 px-1 bg-white hover:bg-gray-50 flex items-center justify-center shadow-lg rounded-r transition-colors z-10"
              >
                <span className="text-gray-400 hover:text-gray-600">→</span>
              </button>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onEdgeClick={onEdgeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              className="bg-white h-full"
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              defaultEdgeOptions={{
                type: "custom",
                animated: true,
                style: { cursor: "pointer" },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: "#22C55E",
                },
              }}
              connectionMode={ConnectionMode.Loose}
            >
              <Background
                color="#666"
                gap={20}
                size={1}
                variant={BackgroundVariant.Dots}
              />
              <Controls
                showZoom={true}
                showFitView={true}
                showInteractive={true}
              />
            </ReactFlow>

            {selectedNode && (
              <NodeProperties
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={handleNodeUpdate}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

const GraphCanvas = () => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
};

export default GraphCanvas;
