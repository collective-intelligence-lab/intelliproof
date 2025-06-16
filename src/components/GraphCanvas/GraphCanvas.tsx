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
  getIncomers,
  getOutgoers,
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
import { useRouter, useSearchParams } from "next/navigation";
import { saveGraph, setCurrentGraph } from "../../store/slices/graphsSlice";
import { ControlButton } from "reactflow";

const CustomNode = ({ data, id }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const CHARACTER_LIMIT = 200;
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Function to truncate text with ellipsis
  const truncateText = (text: string) => {
    if (text.length <= CHARACTER_LIMIT) return text;
    return text.slice(0, CHARACTER_LIMIT) + "...";
  };

  // Drag-and-drop evidence support
  const handleEvidenceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleEvidenceDragLeave = () => setIsDragOver(false);
  const handleEvidenceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const evidenceId = e.dataTransfer.getData("application/x-evidence-id");
    if (evidenceId && data.onEvidenceDrop) {
      data.onEvidenceDrop(evidenceId);
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gray-400 border-2 border-white"
      />
      <div
        onDoubleClick={handleDoubleClick}
        onDragOver={handleEvidenceDragOver}
        onDragLeave={handleEvidenceDragLeave}
        onDrop={handleEvidenceDrop}
        className={`w-full h-full flex items-center justify-center ${
          isEditing ? "nodrag" : ""
        } ${isDragOver ? "ring-2 ring-[#7283D9] bg-[#F0F4FF]" : ""}`}
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
            {truncateText(data.text || "Click to edit")}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gray-400 border-2 border-white"
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
  const graphId = searchParams.get("id");

  const currentGraph = useSelector(
    (state: RootState) =>
      state.graphs.currentGraph as {
        id?: string;
        graph_name?: string;
        graph_data?: { nodes?: ClaimNode[]; edges?: ClaimEdge[] };
      } | null
  );
  const { profile } = useSelector((state: RootState) => state.user);
  const [title, setTitle] = useState(
    currentGraph?.graph_name || "Untitled Graph"
  );
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
  const [currentGraphId, setCurrentGraphId] = useState<string | undefined>(
    undefined
  );
  const connectionCompleted = useRef(false);
  const [supportingDocuments, setSupportingDocuments] = useState<
    Array<{
      id: string;
      name: string;
      type: "document" | "image";
      url: string;
      uploadDate: Date;
      uploader: string;
      size?: number;
    }>
  >([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    title: "",
    supportingDocId: "",
    excerpt: "",
  });
  const [evidenceCards, setEvidenceCards] = useState<
    Array<{
      id: string;
      title: string;
      supportingDocId: string;
      supportingDocName: string;
      excerpt: string;
    }>
  >([]);
  const [selectedEvidenceCard, setSelectedEvidenceCard] = useState<
    null | (typeof evidenceCards)[0]
  >(null);

  // Add effect to handle URL params
  useEffect(() => {
    if (graphId && !currentGraph?.id) {
      console.log("Graph ID from URL:", graphId);
      // If we have a graph ID in the URL but no current graph, try to load it
      dispatch(setCurrentGraph({ id: graphId }));
    }
  }, [graphId, currentGraph, dispatch]);

  // Load graph data into state when currentGraph changes
  useEffect(() => {
    if (currentGraph) {
      console.log("Loading graph data:", currentGraph); // Debug log

      // Set the title from the graph name
      if (currentGraph.graph_name) {
        console.log("Setting graph title to:", currentGraph.graph_name); // Debug log
        setTitle(currentGraph.graph_name);
      } else {
        console.warn("No graph name found in currentGraph:", currentGraph);
        setTitle("Untitled Graph");
      }

      // Ensure we set the graph ID first
      if (currentGraph.id) {
        console.log("Setting current graph ID:", currentGraph.id); // Debug log
        setCurrentGraphId(currentGraph.id);
      } else {
        console.error("No graph ID in currentGraph:", currentGraph);
      }

      // Transform nodes to include required ReactFlow properties
      const formattedNodes = (currentGraph.graph_data?.nodes || []).map(
        (node) => {
          // If node.data is undefined, fallback to node itself (for legacy data)
          const nodeData = node.data || node;
          return {
            id: node.id,
            type: "default" as const,
            position: node.position,
            data: {
              text: nodeData.text || "New Claim",
              type: nodeData.type || "factual",
              author: nodeData.author,
              belief: nodeData.belief || 0.5,
              created_on: nodeData.created_on || new Date().toISOString(),
              onChange: (newText: string) => {
                handleNodeUpdate(node.id, {
                  data: { ...nodeData, text: newText },
                });
              },
              evidenceIds: nodeData.evidenceIds || [],
              onEvidenceDrop: (evidenceId: string) => {
                // Add evidenceId to this node
                handleNodeUpdate(node.id, {
                  data: {
                    ...nodeData,
                    evidenceIds: [...(nodeData.evidenceIds || []), evidenceId],
                  },
                });
              },
            },
            style: {
              backgroundColor:
                nodeData.type === "factual"
                  ? "hsl(168, 65%, 75%)"
                  : nodeData.type === "value"
                  ? "hsl(228, 65%, 80%)"
                  : "hsl(48, 65%, 85%)",
            },
          };
        }
      );

      // Transform edges to include required ReactFlow properties
      const formattedEdges = (currentGraph.graph_data?.edges || []).map(
        (edge) => {
          const edgeData = edge.data || edge;
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "custom" as const,
            data: {
              edgeType: edgeData.edgeType || "supporting",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeData.edgeType === "supporting" ? "#22C55E" : "#EF4444",
            },
          };
        }
      );

      console.log("Formatted nodes:", formattedNodes); // Debug log
      console.log("Formatted edges:", formattedEdges); // Debug log

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
      connectionCompleted.current = true; // Mark that a connection was made
      // Check if an edge already exists between these nodes
      const edgeExists = edges.some(
        (edge) =>
          (edge.source === params.source && edge.target === params.target) ||
          (edge.source === params.target && edge.target === params.source)
      );

      // If edge exists, don't create a new one
      if (edgeExists) return;

      const newEdge: ClaimEdge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: "custom",
        data: {
          edgeType: selectedEdgeType,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds) as ClaimEdge[]);
    },
    [selectedEdgeType, edges]
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

      const target = event.target as Element;
      const targetIsPane = target.classList.contains("react-flow__pane");
      const targetIsHandle = target.classList.contains("react-flow__handle");
      const insideNode = !!target.closest(".react-flow__node");

      // Debug log
      console.log(
        "onConnectEnd event target:",
        target,
        "targetIsPane:",
        targetIsPane,
        "targetIsHandle:",
        targetIsHandle,
        "insideNode:",
        insideNode,
        "connectionCompleted:",
        connectionCompleted.current
      );

      // Clean up connection state
      setConnectingNodeId(null);
      setConnectingHandleType(null);

      // Use setTimeout to check after the event loop
      setTimeout(() => {
        if (connectionCompleted.current) {
          connectionCompleted.current = false; // Reset for next attempt
          return;
        }
        // Only create new node when dropping on empty canvas space (not on node or handle)
        if (!targetIsPane || targetIsHandle || insideNode) return;

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
        };

        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      }, 0);
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
                  ? "hsl(168, 65%, 75%)"
                  : updates.data?.type === "value"
                  ? "hsl(228, 65%, 80%)"
                  : "hsl(48, 65%, 85%)",
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
      console.log("Current graph ID:", currentGraphId);
      console.log("Current graph:", currentGraph);

      // Get the graph ID from either source
      const graphId = currentGraphId || currentGraph?.id;

      if (!graphId) {
        console.error("No graph ID found for saving");
        alert(
          "Cannot save: No graph ID found. Please try refreshing the page."
        );
        return;
      }

      // Format the graph data according to the required structure
      const graphData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          author: node.data.author,
          belief: node.data.belief || 0.5,
          position: node.position,
          created_on: node.data.created_on || new Date().toISOString(),
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.data.edgeType === "supporting" ? 0.5 : -0.5,
        })),
      };

      console.log("Saving graph with ID:", graphId);
      console.log("Graph data:", graphData);

      // Save the graph with the current ID
      const saveResult = await dispatch(
        saveGraph({
          id: graphId,
          graphData,
          graphName: title,
        }) as any
      );

      console.log("Save result:", saveResult);

      if (saveResult.error) {
        throw new Error(saveResult.error);
      }

      // Navigate back to graph manager
      router.push("/graph-manager");
    } catch (error) {
      console.error("Error saving graph:", error);
      alert("Failed to save graph. Please try again.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Duplicate check: same name and size
      const isDuplicate = supportingDocuments.some(
        (doc) => doc.name === file.name && doc.size === file.size
      );
      if (isDuplicate) {
        setToast(`A file named "${file.name}" has already been uploaded.`);
        setTimeout(() => setToast(null), 2000);
        return;
      }
      const fileType = file.type.startsWith("image/") ? "image" : "document";
      const fileUrl = URL.createObjectURL(file);
      setSupportingDocuments((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: fileType,
          url: fileUrl,
          uploadDate: new Date(),
          uploader: "You", // TODO: Replace with real user info
          size: file.size,
        },
      ]);
    });
  };

  const handleDeleteDocument = (id: string) => {
    setSupportingDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const closeEvidenceModal = () => {
    setIsAddEvidenceOpen(false);
    setNewEvidence({ title: "", supportingDocId: "", excerpt: "" });
  };

  // Drag start handler for evidence cards
  const handleEvidenceDragStart = (event: React.DragEvent, cardId: string) => {
    event.dataTransfer.setData("application/x-evidence-id", cardId);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-full h-full relative font-josefin">
      <PanelGroup direction="horizontal">
        {/* Evidence Panel Container */}
        {isEvidencePanelOpen && (
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full bg-white border-r border-black flex flex-col">
              {/* Evidence Header */}
              <div className="p-4 border-b border-black flex justify-between items-center bg-[#FAFAFA] relative">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium tracking-wide uppercase">
                    Evidence
                  </h2>
                  <span className="text-base text-gray-500 font-medium">
                    ({evidenceCards.length})
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

              {/* Evidence Management Section */}
              <div className="p-4 border-b-0">
                <div className="flex justify-end mb-2">
                  <button
                    className="px-3 py-1.5 bg-[#7283D9] text-white rounded-md hover:bg-[#6274ca] transition-colors text-sm"
                    onClick={() => setIsAddEvidenceOpen(true)}
                  >
                    + Add Evidence
                  </button>
                </div>
                {/* Evidence cards */}
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  }}
                >
                  {evidenceCards.length === 0 ? (
                    <div className="p-4 bg-[#FAFAFA] rounded-md border border-dashed border-gray-300 text-center text-gray-500 text-sm col-span-full">
                      No evidence added yet.
                    </div>
                  ) : (
                    evidenceCards.map((card) => {
                      const doc = supportingDocuments.find(
                        (d) => d.id === card.supportingDocId
                      );
                      const isImage = doc?.type === "image";
                      return (
                        <button
                          key={card.id}
                          className="flex flex-col items-stretch justify-between aspect-square min-h-[110px] max-h-[150px] bg-[#FAFAFA] rounded-lg border border-gray-200 shadow-sm overflow-hidden focus:outline-none hover:shadow-md transition-shadow"
                          onClick={() => setSelectedEvidenceCard(card)}
                          type="button"
                          draggable
                          onDragStart={(e) =>
                            handleEvidenceDragStart(e, card.id)
                          }
                        >
                          <div className="flex items-center gap-1 p-2 border-b border-gray-100">
                            {/* Type Icon/Preview */}
                            {isImage ? (
                              <img
                                src={doc?.url}
                                alt="preview"
                                className="w-6 h-6 object-cover rounded"
                              />
                            ) : (
                              <span className="w-6 h-6 flex items-center justify-center bg-[#7283D9] text-white rounded text-xs font-bold">
                                DOC
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">
                                {card.title}
                              </div>
                              <span className="text-[10px] text-gray-500">
                                from: {card.supportingDocName}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 p-2 overflow-hidden">
                            <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">
                              {card.excerpt}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Evidence Creation Modal */}
              {isAddEvidenceOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                    <h2 className="text-lg font-semibold mb-4">Add Evidence</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        // Save evidence logic
                        const doc = supportingDocuments.find(
                          (d) => d.id === newEvidence.supportingDocId
                        );
                        if (!doc) return;
                        setEvidenceCards((prev) => [
                          ...prev,
                          {
                            id: Math.random().toString(36).substr(2, 9),
                            title: newEvidence.title,
                            supportingDocId: doc.id,
                            supportingDocName: doc.name,
                            excerpt: newEvidence.excerpt,
                          },
                        ]);
                        closeEvidenceModal();
                      }}
                      className="space-y-4"
                    >
                      {/* Title */}
                      <div>
                        <label className="block text-base font-medium mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9]"
                          value={newEvidence.title}
                          onChange={(e) =>
                            setNewEvidence((ev) => ({
                              ...ev,
                              title: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      {/* Supporting Doc Select */}
                      <div>
                        <label className="block text-base font-medium mb-1">
                          Supporting Document
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9]"
                          value={newEvidence.supportingDocId}
                          onChange={(e) =>
                            setNewEvidence((ev) => ({
                              ...ev,
                              supportingDocId: e.target.value,
                              excerpt: "",
                            }))
                          }
                          required
                        >
                          <option value="" disabled>
                            Select a document...
                          </option>
                          {supportingDocuments.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Excerpt/Lines for text docs */}
                      {(() => {
                        const doc = supportingDocuments.find(
                          (d) => d.id === newEvidence.supportingDocId
                        );
                        if (doc && doc.type === "document") {
                          return (
                            <div>
                              <label className="block text-base font-medium mb-1">
                                Excerpt / Lines
                              </label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9] min-h-[60px]"
                                placeholder="Paste or type the relevant excerpt or lines here..."
                                value={newEvidence.excerpt}
                                onChange={(e) =>
                                  setNewEvidence((ev) => ({
                                    ...ev,
                                    excerpt: e.target.value,
                                  }))
                                }
                                required
                              />
                            </div>
                          );
                        }
                        if (doc && doc.type === "image") {
                          return (
                            <div>
                              <label className="block text-base font-medium mb-1">
                                Comment / Description
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9]"
                                placeholder="Describe the relevant part of the image..."
                                value={newEvidence.excerpt}
                                onChange={(e) =>
                                  setNewEvidence((ev) => ({
                                    ...ev,
                                    excerpt: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={closeEvidenceModal}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-[#7283D9] text-white hover:bg-[#6274ca]"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Supporting Documents Section */}
              <div className="flex-1 overflow-auto">
                <div className="p-4 flex flex-col gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium tracking-wide uppercase">
                        Supporting Documents
                      </h3>
                      <label className="px-3 py-1.5 bg-[#7283D9] text-white rounded-md hover:bg-[#6274ca] transition-colors text-sm cursor-pointer">
                        Upload
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          multiple
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    {/* Documents List */}
                    <div className="space-y-3">
                      {supportingDocuments.length === 0 ? (
                        <div className="p-4 bg-[#FAFAFA] rounded-md border border-dashed border-gray-300 text-center">
                          <p className="text-gray-500 text-sm">
                            No supporting documents yet.
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Upload documents or images to get started.
                          </p>
                        </div>
                      ) : (
                        supportingDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-medium truncate">
                                    {doc.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({doc.type})
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Uploaded by {doc.uploader}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Uploaded {doc.uploadDate.toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <span className="text-lg">↗</span>
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                                >
                                  <span className="text-lg">×</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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
                  className={`px-3 py-2 rounded-md transition-colors ${
                    selectedNode
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
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      selectedEdgeType === "supporting"
                        ? "bg-green-500 text-white"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    Supporting
                  </button>
                  <button
                    onClick={() => setSelectedEdgeType("attacking")}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      selectedEdgeType === "attacking"
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
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid={true}
              snapGrid={[20, 20]}
            >
              <Background color="#aaa" variant={BackgroundVariant.Dots} />
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
                evidenceCards={evidenceCards}
                supportingDocuments={supportingDocuments}
              />
            )}

            {/* Evidence Card Preview Modal */}
            {selectedEvidenceCard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
                    onClick={() => setSelectedEvidenceCard(null)}
                    aria-label="Close preview"
                  >
                    ×
                  </button>
                  <h2 className="text-lg font-semibold mb-2">
                    {selectedEvidenceCard.title}
                  </h2>
                  <div className="mb-2 text-xs text-gray-500">
                    from: {selectedEvidenceCard.supportingDocName}
                  </div>
                  {/* Supporting doc link */}
                  {(() => {
                    const doc = supportingDocuments.find(
                      (d) => d.id === selectedEvidenceCard.supportingDocId
                    );
                    if (doc) {
                      return (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mb-3 text-xs text-[#7283D9] underline hover:text-[#3c4a8c]"
                        >
                          View Supporting Document
                        </a>
                      );
                    }
                    return null;
                  })()}
                  <div className="mb-4">
                    <span className="block text-xs font-medium mb-1">
                      Excerpt / Description:
                    </span>
                    <div className="text-sm text-gray-700 whitespace-pre-line bg-[#FAFAFA] rounded p-2 border border-gray-100">
                      {selectedEvidenceCard.excerpt}
                    </div>
                  </div>
                  {/* Optionally, show supporting doc preview if image */}
                  {(() => {
                    const doc = supportingDocuments.find(
                      (d) => d.id === selectedEvidenceCard.supportingDocId
                    );
                    if (doc && doc.type === "image") {
                      return (
                        <div className="mt-2">
                          <img
                            src={doc.url}
                            alt="preview"
                            className="w-full max-h-48 object-contain rounded"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
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
