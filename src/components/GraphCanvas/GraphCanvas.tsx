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
  ReactFlowInstance,
} from "reactflow";
import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import "reactflow/dist/style.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  createClaimNode,
  type ClaimNode,
  type ClaimType,
  type ClaimData,
  type Evidence,
  type ExportedGraphData,
} from "../../types/graph";
import type { ClaimEdge, EdgeType } from "../../types/edges";
import NodeProperties from "../NodeProperties/NodeProperties";
import EdgeProperties from "../Edges/EdgeProperties";
import CustomEdge from "../Edges/CustomEdge";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useRouter, useSearchParams } from "next/navigation";
import {
  saveGraph,
  setCurrentGraph,
  fetchSupportingDocuments,
} from "../../store/slices/graphsSlice";
import { ControlButton } from "reactflow";
import SupportingDocumentUploadModal from "./SupportingDocumentUploadModal";
import type {
  GraphItem,
  SupportingDocument,
} from "../../store/slices/graphsSlice";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  CursorArrowRaysIcon,
  HandRaisedIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChatBubbleLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  ArrowsPointingInIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  SparklesIcon,
  DocumentIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { fetchUserData } from "../../store/slices/userSlice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ChatBox from "../ChatBox";
import { extractTextFromImage } from '../../lib/extractImageText';
import React from 'react';
import MessageBox from './MessageBox';

const getNodeStyle: (type: string) => React.CSSProperties = (type) => {
  const common: React.CSSProperties = {
    color: "#000000",
    border: "1px solid #181A1B",
    borderRadius: 0,
    padding: "4px 12px",
    fontFamily: "Josefin Sans, Century Gothic, sans-serif",
    fontSize: "16px",
    transition: "all 200ms ease-out",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: 32,
  };
  switch (type) {
    case "factual":
      return { ...common, backgroundColor: "#05142766" };
    case "value":
      return { ...common, backgroundColor: "#530f1e66" };
    case "policy":
      return { ...common, backgroundColor: "#00000066" };
    default:
      return { ...common, backgroundColor: "#05142766" };
  }
};

const CustomNode = ({ data, id }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const CHARACTER_LIMIT = 200;
  const [isDragOver, setIsDragOver] = useState(false);

  // Update local text when data changes from outside, but only if we're not currently editing
  useEffect(() => {
    if (!isEditing && localText !== data.text) {
      setLocalText(data.text);
    }
  }, [data.text, isEditing, localText]);

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
        className="w-5 h-5 bg-gray-400 border-2 border-white"
      />
      <div
        onDoubleClick={handleDoubleClick}
        onDragOver={handleEvidenceDragOver}
        onDragLeave={handleEvidenceDragLeave}
        onDrop={handleEvidenceDrop}
        className={`w-full h-full flex items-center justify-center m-0 p-0 ${isEditing ? "nodrag" : ""
          } ${isDragOver ? "ring-2 ring-[#7283D9] bg-[#F0F4FF]" : ""}`}
        style={{
          minHeight: "24px",
          minWidth: "40px",
          maxWidth: "200px",
          padding: 0,
          margin: 0,
          lineHeight: 1.2,
          display: "flex",
          alignItems: "center",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-center bg-transparent outline-none border-b border-gray-300 p-0 m-0 flex items-center justify-center"
            style={{
              padding: 0,
              margin: 0,
              minHeight: "24px",
              maxWidth: "200px",
              lineHeight: 1.2,
              height: "100%",
              wordWrap: "break-word",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="w-full text-center break-words p-0 m-0 flex items-center justify-center"
            style={{
              color: "#E5E7EB",
              padding: 0,
              margin: 0,
              minHeight: "24px",
              maxWidth: "200px",
              lineHeight: 1.2,
              height: "100%",
              wordWrap: "break-word",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
          >
            {truncateText(data.text || "Click to edit")}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-5 h-5 bg-gray-400 border-2 border-white"
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
  const dispatch: any = useDispatch();
  const searchParams = useSearchParams();
  const graphId = searchParams?.get("id");
  const [selectedTool, setTool] = useState<
    "select" | "pan" | "zoom-in" | "zoom-out"
  >("select");
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const currentGraph = useSelector(
    (state: RootState) =>
      state.graphs.currentGraph as {
        id?: string;
        graph_name?: string;
        graph_data?: {
          nodes?: ClaimNode[];
          edges?: ClaimEdge[];
          evidence?: Evidence[];
        };
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
  const [selectedEdge, setSelectedEdge] = useState<ClaimEdge | null>(null);
  const [selectedEdgeType, setSelectedEdgeType] =
    useState<EdgeType>("supporting");
  const { project, undo, redo, canUndo, canRedo } =
    useReactFlow() as ReactFlowInstance & {
      undo: () => void;
      redo: () => void;
      canUndo: boolean;
      canRedo: boolean;
    };
  const reactFlowInstance = useReactFlow();
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
      confidence: number;
    }>
  >([]);
  const [selectedEvidenceCard, setSelectedEvidenceCard] = useState<
    null | (typeof evidenceCards)[0]
  >(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isAICopilotFrozen, setIsAICopilotFrozen] = useState(false);
  // Add state for loading OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Use supportingDocuments from Redux
  const supportingDocumentsRedux = useSelector((state: RootState) =>
    currentGraphId ? state.graphs.supportingDocuments[currentGraphId] || [] : []
  );

  // Map Redux docs to local state shape
  useEffect(() => {
    const newDocs = supportingDocumentsRedux.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type as "document" | "image",
      url: doc.url,
      uploadDate: doc.upload_date ? new Date(doc.upload_date) : new Date(),
      uploader: doc.uploader_email || "Unknown",
      size: doc.size,
    }));

    // Only update if the documents have actually changed
    const hasChanged =
      JSON.stringify(newDocs) !== JSON.stringify(supportingDocuments);
    if (hasChanged) {
      setSupportingDocuments(newDocs);
    }
  }, [supportingDocumentsRedux, supportingDocuments]);

  // Add effect to handle URL params
  const graphs = useSelector((state: RootState) => state.graphs.items);

  useEffect(() => {
    if (graphId && !currentGraph?.id) {
      const graphItem = graphs.find((g: GraphItem) => g.id === graphId) || null;
      if (graphItem) {
        console.log("Setting currentGraph from graphs:", graphItem);
        dispatch(setCurrentGraph(graphItem));
        setCurrentGraphId(graphId);
      }
    }
  }, [graphId, currentGraph, dispatch, graphs]);

  // Add effect to fetch supporting documents when currentGraphId changes
  useEffect(() => {
    if (currentGraphId) {
      console.log("Fetching supporting documents for graph:", currentGraphId);
      dispatch(fetchSupportingDocuments(currentGraphId));
    }
  }, [currentGraphId, dispatch]);

  // After graph loads, set currentGraphId and log profile
  useEffect(() => {
    if (currentGraph && currentGraph.id) {
      setCurrentGraphId(currentGraph.id);
      console.log("currentGraphId set:", currentGraph.id);
    }
    if (profile) {
      console.log("Profile loaded:", profile);
    }
  }, [currentGraph, profile]);

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

      // Helper for node style
      const getNodeStyle = (type: string) => {
        switch (type) {
          case "factual":
            return {
              backgroundColor: "#05142766",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "16px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 32,
            };
          case "value":
            return {
              backgroundColor: "#530f1e66",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "16px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 32,
            };
          case "policy":
            return {
              backgroundColor: "#00000066",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "16px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 32,
            };
          default:
            return {
              backgroundColor: "#05142766",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "16px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 32,
            };
        }
      };

      // Transform nodes to include required ReactFlow properties
      const formattedNodes = (currentGraph.graph_data?.nodes || []).map(
        (node) => {
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
                handleNodeUpdate(node.id, {
                  data: {
                    ...nodeData,
                    evidenceIds: [...(nodeData.evidenceIds || []), evidenceId],
                  },
                });
              },
            },
            style: getNodeStyle(nodeData.type || node.type),
          };
        }
      );

      // Transform edges to include required ReactFlow properties
      const formattedEdges = (currentGraph.graph_data?.edges || []).map(
        (edge) => {
          let edgeType: EdgeType = "supporting";
          let confidence: number = 0;
          // If edge is a ClaimEdge (has 'data'), use its data
          if ('data' in edge && edge.data) {
            edgeType = edge.data.edgeType || "supporting";
            confidence = edge.data.confidence ?? 0;
          } else if ('weight' in edge && typeof edge.weight === 'number') {
            // Legacy or exported edge
            confidence = edge.weight;
            edgeType = edge.weight >= 0 ? "supporting" : "attacking";
          }
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "custom" as const,
            data: {
              edgeType,
              confidence,
            },
            markerStart: {
              type: MarkerType.ArrowClosed,
              color: edgeType === "supporting" ? "#166534" : "#991B1B",
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

  // Load evidence from graph_data when currentGraph changes
  useEffect(() => {
    if (currentGraph?.graph_data?.evidence) {
      setEvidenceCards(currentGraph.graph_data.evidence.map(ev => ({
        ...ev,
        confidence: typeof ev.confidence === 'number' ? ev.confidence : 0.5,
      })));
    } else {
      setEvidenceCards([]);
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
        type: "custom" as const,
        data: {
          edgeType: "supporting", // default, will be updated by user
          confidence: 0,
        },
        markerStart: {
          type: MarkerType.ArrowClosed,
          color: "#166534",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds) as ClaimEdge[]);
    },
    [edges]
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
          type: "custom" as const,
          data: {
            edgeType: "supporting", // default, will be updated by user
            confidence: 0,
          },
          markerStart: {
            type: MarkerType.ArrowClosed,
            color: "#166534",
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      }, 0);
    },
    [connectingNodeId, connectingHandleType, project]
  );

  // --- Selection logic: only one selection at a time ---
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node as ClaimNode);
    setSelectedEdge(null); // Deselect edge
  };

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge as ClaimEdge);
    setSelectedNode(null); // Deselect node
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<ClaimNode>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newType = updates.data?.type || node.data.type;
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
            style: getNodeStyle(newType),
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
    setSelectedEdge(edge as ClaimEdge);
  };

  const handleEdgeUpdate = (edgeId: string, updates: Partial<ClaimEdge>) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edgeId) {
          return {
            ...e,
            ...updates,
            data: {
              ...e.data,
              ...updates.data,
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

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

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
        evidence: evidenceCards,
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          author: node.data.author,
          belief: clamp(node.data.belief ?? 0.5, 0, 1),
          position: node.position,
          created_on: node.data.created_on || new Date().toISOString(),
          evidenceIds: node.data.evidenceIds || [],
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: clamp(edge.data.confidence, -1, 1),
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

  // Handler for successful upload
  const handleUploadSuccess = (doc: SupportingDocument) => {
    if (currentGraphId) {
      dispatch(fetchSupportingDocuments(currentGraphId));
    }
    setIsUploadModalOpen(false);
    setToast("Document uploaded!");
    setTimeout(() => setToast(null), 2000);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(`/api/supporting-documents?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete document');
      }

      // Refresh supporting documents list
      if (currentGraphId) {
        dispatch(fetchSupportingDocuments(currentGraphId));
      }

      setToast("Document deleted successfully!");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('Error deleting document:', error);
      setToast("Failed to delete document. Please try again.");
      setTimeout(() => setToast(null), 3000);
    }
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

  const handleExport = () => {
    // Format the graph data according to the required structure
    const graphData: ExportedGraphData = {
      evidence: evidenceCards || [],
      nodes: nodes.map((node) => ({
        id: node.id,
        text: node.data.text,
        type: node.data.type,
        author: node.data.author,
        belief: clamp(node.data.belief ?? 0.5, 0, 1),
        position: node.position,
        created_on: node.data.created_on || new Date().toISOString(),
        evidenceIds: node.data.evidenceIds || [],
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: clamp(edge.data.confidence, -1, 1),
      })),
    };

    // Create a blob with the graph data
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    // Create a temporary link element and trigger the download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "graph"}-export.json`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    try {
      // Get the ReactFlow canvas element
      const element = document.querySelector(".react-flow") as HTMLElement;
      if (!element) {
        throw new Error("Could not find ReactFlow canvas");
      }

      // Create a canvas from the ReactFlow element
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      // Add the canvas image to the PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      // Save the PDF
      pdf.save(`${title || "graph"}-report.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF report. Please try again.");
    }
  };

  // Add debug log before return
  console.log("Rendering SupportingDocumentUploadModal:", {
    isUploadModalOpen,
    currentGraphId,
    uploaderEmail: profile?.email,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as HTMLElement)
      ) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load user data when component mounts
  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      dispatch(fetchUserData(accessToken));
    }
  }, [dispatch]);

  // Add click outside handler for menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as HTMLElement)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/signin");
  };

  // Add state for AI Copilot chat messages and loading
  const [copilotMessages, setCopilotMessages] = useState<{ role: string; content: any }[]>([]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Handler for Claim icon click
  const handleClaimCredibility = async () => {
    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      { role: 'user', content: 'Analyze claim credibility for the graph. Compute credibility using evidence confidence scores and returns final credibility score from propagation algorithm.' },
    ]);
    try {
      // Gather evidence scores for all nodes
      const requestNodes = nodes.map(node => ({
        id: node.id,
        evidence: Array.isArray(node.data.evidenceIds)
          ? node.data.evidenceIds.map(() => 0.5) // Use 0.5 as default confidence
          : [0.5], // If no evidence, use a default value
        evidence_min: -1.0,
        evidence_max: 1.0
      }));

      // Construct edges array from all edges in the graph
      const requestEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data.confidence || 0.5
      }));

      const requestBody = {
        nodes: requestNodes,
        edges: requestEdges,
        lambda: 0.7,
        epsilon: 0.01,
        max_iterations: 20,
        evidence_min: -1.0,
        evidence_max: 1.0
      };

      console.log('Sending request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('/api/ai/get-claim-credibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to fetch credibility.";
        try {
          const errorData = await response.json();
          if (response.status === 422 && errorData.detail) {
            errorMsg = "Invalid request format. Please ensure nodes and edges are provided.";
          } else if (errorData.detail) {
            errorMsg = typeof errorData.detail === "string"
              ? errorData.detail
              : JSON.stringify(errorData.detail);
          }
        } catch {
          errorMsg = "Failed to fetch credibility.";
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // Map node IDs to their text for display
      const nodeIdToText = Object.fromEntries(nodes.map(node => [node.id, node.data.text]));
      // Build a readable string for the scores, tabbed and rounded to 5 decimal places, with node text in quotes
      const scoresList = Object.entries(data.final_scores)
        .map(([id, score]) => `"${nodeIdToText[id] ? nodeIdToText[id] : id}"\t${(score as number).toFixed(5)}`)
        .join('<br />');
      const credibilityMessages = Object.entries(data.final_scores).map(([id, score]) => ({
        role: 'ai',
        content: {
          "Claim Node ID": id,
          "Claim Text": nodeIdToText[id] ? nodeIdToText[id] : id,
          "Final Credibility Score": (score as number).toFixed(5),
        },
        isStructured: true,
      }));
      setCopilotMessages((msgs) => [
        ...msgs,
        ...credibilityMessages,
      ]);
    } catch (err: any) {
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: 'system', content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handler for Check Evidence icon click
  const handleCheckEvidence = async () => {
    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      { role: 'user', content: 'Check evidence for each claim and evaluate whether it supports the claim.' },
    ]);
    try {
      // Prepare request body
      const requestBody = {
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          evidenceIds: node.data.evidenceIds || [],
        })),
        evidence: evidenceCards,
        supportingDocuments: supportingDocumentsRedux,
      };
      const response = await fetch('/api/ai/check-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        let errorMsg = "Failed to check evidence.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      // Display each result as a message in the copilot
      data.results.forEach((result: any) => {
        const claimNode = nodes.find((n) => n.id === result.node_id);
        const claimText = claimNode ? claimNode.data.text : '';
        const evidenceObj = evidenceCards.find((ev) => ev.id === result.evidence_id);
        const evidenceTitle = evidenceObj ? evidenceObj.title : '';
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: 'ai',
            content: {
              "Claim Node ID": result.node_id,
              "Claim": claimText,
              "Evidence ID": result.evidence_id,
              "Evidence Title": evidenceTitle,
              "Evaluation": result.evaluation,
              "Reasoning": result.reasoning,
              "Confidence": `${Math.round(result.confidence * 100)}%`,
            },
            isStructured: true,
          },
        ]);
      });
      // Update evidence confidences
      setEvidenceCards((prevEvidence) =>
        prevEvidence.map((ev) => {
          const found = data.results.find((r: any) => r.evidence_id === ev.id);
          if (found) {
            return { ...ev, confidence: found.confidence };
          }
          return ev;
        })
      );
      // Aggregate confidence for each node and update node belief
      const nodeConfidenceMap: { [nodeId: string]: number[] } = {};
      data.results.forEach((result: any) => {
        if (!nodeConfidenceMap[result.node_id]) nodeConfidenceMap[result.node_id] = [];
        nodeConfidenceMap[result.node_id].push(result.confidence);
      });
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (nodeConfidenceMap[node.id]) {
            const avgConfidence =
              nodeConfidenceMap[node.id].reduce((a, b) => a + b, 0) /
              nodeConfidenceMap[node.id].length;
            return {
              ...node,
              data: {
                ...node.data,
                belief: avgConfidence,
              },
            };
          }
          return node;
        })
      );
    } catch (err: any) {
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: 'ai', content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleUpdateEvidenceConfidence = (evidenceId: string, confidence: number) => {
    setEvidenceCards((prev) =>
      prev.map((ev) =>
        ev.id === evidenceId ? { ...ev, confidence } : ev
      )
    );
  };

  return (
    <div className="w-full h-full relative font-josefin">
      <PanelGroup direction="horizontal">
        {/* Evidence Panel Container */}
        {isEvidencePanelOpen && (
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full bg-white border-r border-black flex flex-col">
              {/* Evidence Header */}
              <div className="p-4 border-b border-black flex justify-between items-center bg-white relative">
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
                    className="px-3 py-1.5 bg-[#232F3E] text-[#F3F4F6] rounded-md hover:bg-[#1A2330] transition-colors text-sm"
                    onClick={() => setIsAddEvidenceOpen(true)}
                  >
                    + Add Evidence
                  </button>
                </div>
                {/* Evidence cards */}
                <div className="space-y-3">
                  {evidenceCards.length === 0 ? (
                    <div className="p-4 bg-[#FAFAFA] rounded-md border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                      No evidence added yet.
                    </div>
                  ) : (
                    evidenceCards.map((card) => {
                      const doc = supportingDocuments.find(
                        (d) => d.id === card.supportingDocId
                      );
                      const isImage = doc?.type === "image";
                      return (
                        <div
                          key={card.id}
                          className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
                          onClick={() => setSelectedEvidenceCard(card)}
                          draggable
                          onDragStart={(e) =>
                            handleEvidenceDragStart(e, card.id)
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-medium truncate">
                                  {card.title}
                                </span>
                                <span className="text-xs text-gray-500">
                                  from: {card.supportingDocName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-700 mt-1 line-clamp-2 whitespace-pre-line">
                                {card.excerpt}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {/* Type Icon/Preview */}
                              {isImage ? (
                                <img
                                  src={doc?.url}
                                  alt="preview"
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : (
                                <span className="w-8 h-8 flex items-center justify-center bg-[#7283D9] text-white rounded text-xs font-bold">
                                  DOC
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
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
                        const doc = supportingDocuments.find(
                          (d) => d.id === newEvidence.supportingDocId
                        );
                        if (!doc) return;
                        setEvidenceCards((prev) => [
                          ...prev,
                          {
                            id: uuidv4(),
                            title: newEvidence.title,
                            supportingDocId: doc.id,
                            supportingDocName: doc.name,
                            excerpt: newEvidence.excerpt,
                            confidence: 0.5,
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
                          // NOTE: To enable OCR, you must track the File object for each uploaded image in state and associate it with the supporting document entry.
                          // If the File object is not available, disable the button and show a message.
                          const fileObj = undefined; // <-- You must implement logic to track the File object for each image
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
                              <button
                                type="button"
                                className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                disabled={ocrLoading || !fileObj}
                                onClick={async () => {
                                  setOcrError(null);
                                  setOcrLoading(true);
                                  try {
                                    if (!fileObj) throw new Error('Image file not found. Please upload a new image or ensure the file is available.');
                                    const text = await extractTextFromImage(fileObj, false);
                                    setNewEvidence(ev => ({ ...ev, excerpt: text }));
                                  } catch (err: any) {
                                    setOcrError(err.message);
                                  } finally {
                                    setOcrLoading(false);
                                  }
                                }}
                              >
                                {ocrLoading ? 'Extracting...' : 'Extract Text from Image'}
                              </button>
                              {!fileObj && <div className="text-yellow-600 text-xs mt-1">Image file not available for OCR. Please upload a new image to enable this feature.</div>}
                              {ocrError && <div className="text-red-500 text-xs mt-1">{ocrError}</div>}
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
                          className="px-4 py-2 rounded-md bg-[#232F3E] text-[#F3F4F6] hover:bg-[#1A2330]"
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
                      <button
                        className="px-3 py-1.5 bg-[#232F3E] text-[#F3F4F6] rounded-md hover:bg-[#1A2330] transition-colors text-sm cursor-pointer"
                        onClick={() => {
                          console.log("Upload button clicked");
                          setIsUploadModalOpen(true);
                        }}
                        type="button"
                      >
                        Upload
                      </button>
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
            <div className="absolute top-6 left-6 z-10 bg-white rounded-lg shadow-lg p-2 pl-3">
              <div className="flex items-center gap-3">
                {/* Logo and Text */}
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo.png"
                    alt="intelliProof Logo"
                    width={44}
                    height={44}
                  />
                  <span className="text-2xl font-bold tracking-tight text-[#232F3E]">
                    Intelli<span className="text-[#232F3E]">Proof</span>
                  </span>
                </div>

                <div className="h-10 w-px bg-gray-200 mx-3 my-auto"></div>

                {/* Editable Title */}
                <div className="min-w-[100px] flex items-center justify-center">
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={handleTitleChange}
                      onBlur={() => setIsEditing(false)}
                      className="bg-transparent border-b border-gray-300 focus:border-[#7283D9] outline-none px-0.5 font-medium text-lg text-center w-full"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setIsEditing(true)}
                      className="cursor-pointer hover:bg-gray-100 px-0.5 py-0 rounded text-lg text-center w-full"
                    >
                      {title}
                    </span>
                  )}
                </div>

                <div className="h-10 w-px bg-gray-200 mx-3 my-auto"></div>

                {/* Menu Button */}
                <div className="relative flex items-center -ml-4" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-1.5 rounded-md transition-all duration-200 flex items-center justify-center h-11 w-11 ${isMenuOpen
                      ? "bg-gray-100"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                    title="Menu"
                  >
                    <EllipsisVerticalIcon
                      className="w-9 h-9"
                      strokeWidth={2.5}
                    />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 top-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-10">
                      <button
                        onClick={() => {
                          router.push("/graph-manager");
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                        Back to Graph Manager
                      </button>
                      <div className="w-full h-px bg-gray-200 my-1"></div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <ArrowUturnRightIcon className="w-5 h-5" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Top Right Navbar */}
            <div className="absolute top-6 right-6 z-10 bg-white rounded-lg shadow-lg p-2">
              <div className="flex items-center gap-4">
                {/* Undo/Redo Buttons */}
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${canUndo
                    ? "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                    : "text-gray-300 cursor-not-allowed"
                    }`}
                  title="Undo"
                >
                  <ArrowUturnLeftIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${canRedo
                    ? "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                    : "text-gray-300 cursor-not-allowed"
                    }`}
                  title="Redo"
                >
                  <ArrowUturnRightIcon className="w-8 h-8" strokeWidth={2} />
                </button>

                <div className="h-12 w-px bg-gray-200"></div>

                {/* Share, Export, Save, and Generate Report Buttons */}
                <button
                  onClick={() => {
                    /* Add share functionality */
                  }}
                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  title="Share"
                >
                  <ShareIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  title="Export"
                >
                  <ArrowDownTrayIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                <button
                  onClick={handleSave}
                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  title="Save"
                >
                  <DocumentCheckIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  title="Generate Report"
                >
                  <DocumentIcon className="w-8 h-8" strokeWidth={2} />
                </button>

                <div className="h-12 w-px bg-gray-200"></div>

                {/* Profile Icon and Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="w-12 h-12 rounded-full bg-[#232F3E] text-white flex items-center justify-center text-xl font-semibold hover:bg-[#2d3b4d] transition-colors"
                  >
                    <span className="pt-0.5">{profile?.first_name?.[0]}</span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                      <div className="px-4 py-2 text-sm text-gray-700">
                        <div className="font-medium">
                          {profile?.first_name} {profile?.last_name}
                        </div>
                        <div className="text-gray-500 truncate">
                          {profile?.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tools Navbar */}
            <div className="absolute left-6 top-24 z-10 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-4 w-[60px]">
              {/* Add Node Button */}
              <div className="relative">
                <button
                  onClick={() => setIsAddNodeOpen(!isAddNodeOpen)}
                  className={`p-2.5 rounded-lg transition-all duration-200 w-full flex items-center justify-center ${isAddNodeOpen
                    ? "bg-[#232F3E] text-white shadow-inner"
                    : "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                    }`}
                  title="Add Claim"
                >
                  <PlusIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                {isAddNodeOpen && (
                  <div className="absolute left-full top-0 ml-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 min-w-[180px] z-10">
                    <button
                      onClick={() => addNode("factual")}
                      className="w-full text-left px-5 py-2.5 text-[#4A5663] hover:bg-[#4A5663] hover:text-white text-xl transition-colors"
                    >
                      Factual
                    </button>
                    <button
                      onClick={() => addNode("value")}
                      className="w-full text-left px-5 py-2.5 text-[#889178] hover:bg-[#889178] hover:text-white text-xl transition-colors"
                    >
                      Value
                    </button>
                    <button
                      onClick={() => addNode("policy")}
                      className="w-full text-left px-5 py-2.5 text-[#888C94] hover:bg-[#888C94] hover:text-white text-xl transition-colors"
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
                className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${selectedNode
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700 hover:scale-105 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
                  }`}
                title="Delete Claim"
              >
                <TrashIcon className="w-8 h-8" strokeWidth={2} />
              </button>

              <div className="w-full h-px bg-gray-200"></div>

              {/* Edge Type Buttons */}
              <button
                onClick={() => setSelectedEdgeType("supporting")}
                className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${selectedEdgeType === "supporting"
                  ? "bg-[#166534] bg-opacity-20 text-[#166534]"
                  : "text-gray-700 hover:bg-gray-100"
                  }`}
                title="Supporting Edge"
              >
                <ArrowPathIcon className="w-8 h-8 rotate-90" strokeWidth={2} />
              </button>

              <button
                onClick={() => setSelectedEdgeType("attacking")}
                className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${selectedEdgeType === "attacking"
                  ? "bg-[#991B1B] bg-opacity-20 text-[#991B1B]"
                  : "text-gray-700 hover:bg-gray-100"
                  }`}
                title="Attacking Edge"
              >
                <ArrowPathIcon className="w-8 h-8 -rotate-90" strokeWidth={2} />
              </button>

              <div className="w-full h-px bg-gray-200"></div>

              {/* Evidence Panel Toggle */}
              <button
                onClick={() => setIsEvidencePanelOpen(!isEvidencePanelOpen)}
                className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${isEvidencePanelOpen
                  ? "bg-[#232F3E] text-white shadow-inner"
                  : "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  }`}
                title={
                  isEvidencePanelOpen
                    ? "Hide Evidence Panel"
                    : "Show Evidence Panel"
                }
              >
                <DocumentTextIcon className="w-8 h-8" strokeWidth={2} />
              </button>
            </div>

            {/* Bottom Left Controls */}
            <div className="absolute left-6 bottom-6 z-10 bg-white rounded-lg shadow-lg p-2 flex flex-row gap-4 h-[60px]">
              <button
                onClick={() => reactFlowInstance.zoomIn()}
                className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="w-8 h-8" strokeWidth={2} />
              </button>
              <button
                onClick={() => reactFlowInstance.zoomOut()}
                className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="w-8 h-8" strokeWidth={2} />
              </button>
              <button
                onClick={() => reactFlowInstance.fitView()}
                className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                title="Fit View"
              >
                <ArrowsPointingInIcon className="w-8 h-8" strokeWidth={2} />
              </button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onEdgeClick={handleEdgeClick} // <-- update this
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              className="bg-[#F0F1F3] h-full"
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              defaultEdgeOptions={{
                type: "custom",
                animated: true,
                style: { cursor: "pointer" },
                markerStart: {
                  type: MarkerType.ArrowClosed,
                  color: "#166534",
                },
                data: {
                  edgeType: "supporting",
                  confidence: 0.5,
                },
              }}
              connectionMode={ConnectionMode.Loose}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid={true}
              snapGrid={[20, 20]}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#6B7280" variant={BackgroundVariant.Dots} />
              <Controls className="!hidden" />
            </ReactFlow>

            {/* Properties Modal beside AI Copilot */}
            {(selectedNode || selectedEdge) && (
              <div
                style={{
                  position: 'fixed',
                  top: 80, // adjust as needed
                  right: isAICopilotOpen ? '27vw' : 0, // leave space for Copilot if open
                  zIndex: 50,
                  width: 270,
                  maxWidth: '67.5vw',
                  background: 'white',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                  borderRadius: 16,
                  border: '1px solid #eee',
                  padding: 0,
                  transition: 'right 0.3s',
                }}
              >
                {selectedNode && !selectedEdge && (
                  <NodeProperties
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onUpdate={handleNodeUpdate}
                    evidenceCards={evidenceCards}
                    supportingDocuments={supportingDocuments}
                    onUpdateEvidenceConfidence={handleUpdateEvidenceConfidence}
                  />
                )}
                {selectedEdge && !selectedNode && (
                  <EdgeProperties
                    edge={selectedEdge}
                    onClose={() => setSelectedEdge(null)}
                    onUpdate={handleEdgeUpdate}
                  />
                )}
              </div>
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

        {/* AI Copilot Panel */}
        {isAICopilotOpen && (
          <PanelResizeHandle className="w-1 hover:w-1.5 bg-black/10 hover:bg-black/20 transition-all cursor-col-resize" />
        )}

        {isAICopilotOpen && (
          <Panel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full bg-white border-l border-black flex flex-col">
              {/* AI Copilot Header */}
              <div className="p-4 border-b border-black flex justify-between items-center bg-white relative">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-6 h-6 text-purple-500" />
                  <h2 className="text-lg font-medium tracking-wide uppercase">
                    AI Copilot
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAICopilotFrozen(f => !f)}
                    className={`p-2 rounded-full transition-colors ${isAICopilotFrozen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title={isAICopilotFrozen ? 'Unfreeze Copilot Panel' : 'Freeze Copilot Panel'}
                  >
                    {isAICopilotFrozen ? (
                      <LockClosedIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <LockOpenIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => !isAICopilotFrozen && setIsAICopilotOpen(false)}
                    className={`p-2 hover:bg-white rounded-md transition-colors ${isAICopilotFrozen ? 'opacity-40 cursor-not-allowed' : ''}`}
                    aria-label="Close AI copilot"
                    disabled={isAICopilotFrozen}
                  >
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-auto p-4">
                <div className="text-center text-gray-500 mt-4">
                  AI Copilot is ready to assist you with your graph.
                </div>
                <div className="mt-4 space-y-2">
                  {copilotMessages.map((msg, idx) => (
                    <ChatBox key={idx}>
                      {msg.isStructured ? (
                        <MessageBox message={msg.content} />
                      ) : msg.role === 'assistant' ? (
                        <span
                          className={`text-left text-sm text-blue-700`}
                          dangerouslySetInnerHTML={{ __html: msg.content }}
                        />
                      ) : (
                        <span className={`text-left text-sm ${msg.role === 'system' ? 'text-gray-500' : 'text-black'}`}>{msg.content}</span>
                      )}
                    </ChatBox>
                  ))}
                  {copilotLoading && <ChatBox><span className="text-purple-500 text-sm">Analyzing claim credibility...</span></ChatBox>}
                </div>
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="Ask anything about your graph..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-600">
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                </div>
                {/* AI Functionality Section */}
                <div className="flex flex-row justify-between gap-4 mt-4">
                  {/* Claim Section */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-1">Claim</span>
                    <button
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="Compute claim credibility: Aggregates evidence for the selected claim and returns the initial credibility score (Eᵢ)."
                      onClick={handleClaimCredibility}
                      disabled={copilotLoading}
                    >
                      <HandRaisedIcon className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  {/* Check Evidence Section */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-1">Check Evidence</span>
                    <button
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="Check evidence for each claim: Evaluates whether each piece of evidence supports its linked claim."
                      onClick={handleCheckEvidence}
                      disabled={copilotLoading}
                    >
                      <DocumentMagnifyingGlassIcon className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  {/* Edge Section */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-1">Edge</span>
                    <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                      <ArrowPathIcon className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  {/* Graph Section */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-1">Graph</span>
                    <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                      <SparklesIcon className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </PanelGroup>

      {/* AI Copilot Toggle Button */}
      {!isAICopilotOpen && (
        <div className="absolute right-6 bottom-6 z-10">
          <button
            onClick={() => setIsAICopilotOpen(!isAICopilotOpen)}
            className={`h-[60px] w-[60px] rounded-lg transition-all duration-200 flex items-center justify-center bg-white shadow-lg text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95`}
            title="Open AI Copilot"
          >
            <SparklesIcon className="w-9 h-9" strokeWidth={2} />
          </button>
        </div>
      )}

      <SupportingDocumentUploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        graphId={currentGraphId || ""}
        uploaderEmail={profile?.email || ""}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

const GraphCanvas = () => {
  return (
    <ReactFlowProvider>
      <Suspense fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      }>
        <GraphCanvasInner />
      </Suspense>
    </ReactFlowProvider>
  );
};

export default GraphCanvas;
