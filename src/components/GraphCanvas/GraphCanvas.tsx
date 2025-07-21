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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathRoundedSquareIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { fetchUserData } from "../../store/slices/userSlice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ChatBox from "../ChatBox";
import { extractTextFromImage } from "../../lib/extractImageText";
import React from "react";
import MessageBox from "./MessageBox";
import CommandMessageBox from "./CommandMessageBox";
import PDFPreviewer from "./PDFPreviewer";
import type { PDFPreviewerHandle } from "./PDFPreviewer";
import ImagePreviewer from "./ImagePreviewer";

const getNodeStyle: (type: string) => React.CSSProperties = (type) => {
  const getColors = (type: string) => {
    switch (type) {
      case "factual":
        return {
          background: "#E6EAF3",
          header: "#8BA2D3",
        };
      case "value":
        return {
          background: "#E6EEE8",
          header: "#7DAF8C",
        };
      case "policy":
        return {
          background: "#F2E6E7",
          header: "#BD7E8B",
        };
      default:
        return {
          background: "#E6EAF3",
          header: "#6B8BC5",
        };
    }
  };

  const colors = getColors(type);

  return {
    backgroundColor: colors.background,
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(0, 0, 0, 0.8)",
    borderRadius: "3px",
    padding: "0",
    fontFamily: "Arial, sans-serif",
    fontSize: "8px",
    cursor: "pointer",
    minWidth: "70px",
    width: "fit-content",
    maxWidth: "160px",
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center" as const,
    transition: "all 200ms ease",
  };
};

const CustomNode = ({ data, id, selected }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const CHARACTER_LIMIT = 200;

  const colors = (() => {
    switch (data.type) {
      case "factual":
        return {
          background: "#eeeeee", // Light gray
          header: "#aeaeae", // Medium gray
        };
      case "value":
        return {
          background: "#F2F4E8", // Very light olive green
          header: "#B2B4A8", // Darker olive green
        };
      case "policy":
        return {
          background: "#F0F3F9", // Very light navy blue
          header: "#B0B3B9", // Darker navy blue
        };
      default:
        return {
          background: "#eeeeee", // Light gray
          header: "#aeaeae", // Medium gray
        };
    }
  })();

  useEffect(() => {
    if (!isEditing && localText !== data.text) {
      setLocalText(data.text);
    }
  }, [data.text, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localText !== data.text) {
      data.onChange?.(localText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setLocalText(data.text);
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

  const truncateText = (text: string) => {
    if (text.length <= CHARACTER_LIMIT) return text;
    return text.slice(0, CHARACTER_LIMIT) + "...";
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!absolute !w-1 !h-1 !bg-black !rounded-full !z-10 !border !border-white !border-[0.5px]"
        style={{
          left: "-0.45px",
          top: "50%",
          transform: "translate(-50%, -50%)",
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
      />
      <div className="flex flex-col w-full p-0 m-0 group">
        {/* Corner header section */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "fit-content",
            minWidth: "28px",
            maxWidth: "40px",
            height: "10px", // Reduced from 12px to 10px
            backgroundColor: colors.header,
            borderBottomRightRadius: "3px",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            fontSize: "8px",
            fontWeight: "300",
            letterSpacing: "0.03em",
            fontFamily: "DM Sans, sans-serif",
            padding: "7px 7px 7px 7px", // Added minimal padding
          }}
        >
          {data.type === "factual" ? "Factual" : data.type}
        </div>
        {/* Content section */}
        <div
          onDoubleClick={handleDoubleClick}
          className={`w-full px-1.5 ${isEditing ? "nodrag" : ""}`}
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "8px",
            paddingTop: "10px",
            paddingBottom: "0px",
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
              className="w-full bg-transparent outline-none border-b border-gray-300"
              style={{ fontFamily: "DM Sans, sans-serif", fontSize: "8px" }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // Fon
            <div className="w-full break-words text-[8px]">
              {truncateText(data.text || "Click to edit")}
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!absolute !w-1 !h-1 !bg-black !rounded-full !z-10 !border !border-white !border-[0.5px]"
        style={{
          right: "-0.45px",
          top: "50%",
          transform: "translate(50%, -50%)",
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
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

// Add prop type for GraphCanvas
interface GraphCanvasProps {
  hideNavbar?: boolean;
}

const GraphCanvasInner = ({ hideNavbar = false }: GraphCanvasProps) => {
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
              backgroundColor: "#3A455333",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px ",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "12px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
              minHeight: 32,
            };
          case "value":
            return {
              backgroundColor: "#88917833",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "12px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
              minHeight: 32,
            };
          case "policy":
            return {
              backgroundColor: "#888C9433",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px 12px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "12px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
              minHeight: 32,
            };
          default:
            return {
              backgroundColor: "#3A455333",
              color: "#000000",
              border: "1px solid #181A1B",
              borderRadius: 0,
              padding: "4px",
              fontFamily: "Josefin Sans, Century Gothic, sans-serif",
              fontSize: "12px",
              transition: "all 200ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
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
          if ("data" in edge && edge.data) {
            edgeType = edge.data.edgeType || "supporting";
            confidence = edge.data.confidence ?? 0;
          } else if ("weight" in edge && typeof edge.weight === "number") {
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
      setEvidenceCards(
        currentGraph.graph_data.evidence.map((ev) => ({
          ...ev,
          confidence: typeof ev.confidence === "number" ? ev.confidence : 0.5,
        }))
      );
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
      ...createClaimNode("new node", type), // Changed from "New Claim" to "new node"
      data: {
        ...createClaimNode("new node", type).data, // Changed from "New Claim" to "new node"
        text: "new node", // Changed from "New Claim" to "new node"
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
          ...createClaimNode("new node", "factual"),
          position,
          data: {
            ...createClaimNode("new node", "factual").data,
            text: "new node",
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
          const currentStyle = node.style || {};

          // Only update style if the type has changed
          const style =
            newType !== node.data.type
              ? {
                ...currentStyle,
                ...getNodeStyle(newType),
                // Keep existing width/height if they exist
                ...(currentStyle.width && { width: currentStyle.width }),
                ...(currentStyle.height && { height: currentStyle.height }),
              }
              : currentStyle;

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
            style,
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

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

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

      // Check if the save was rejected
      if (saveResult.meta.requestStatus === "rejected") {
        const errorMessage =
          saveResult.error?.message ||
          saveResult.payload?.error ||
          "Failed to save graph";
        throw new Error(errorMessage);
      }

      // Navigate back to graph manager
      router.push("/graph-manager");
    } catch (error) {
      console.error("Error saving graph:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save graph. Please try again.";
      alert(errorMessage);
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
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete document");
      }

      // Refresh supporting documents list
      if (currentGraphId) {
        dispatch(fetchSupportingDocuments(currentGraphId));
      }

      setToast("Document deleted successfully!");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error("Error deleting document:", error);
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
  const [copilotMessages, setCopilotMessages] = useState<
    { role: string; content: any; isStructured?: boolean }[]
  >([]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Handler for Claim icon click
  const handleClaimCredibility = async () => {
    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content:
          "Compute credibility using evidence confidence scores and return credibility score.",
      },
    ]);
    try {
      // Gather evidence scores for all nodes
      const requestNodes = nodes.map((node) => ({
        id: node.id,
        evidence: Array.isArray(node.data.evidenceIds)
          ? node.data.evidenceIds.map(() => 0.5) // Use 0.5 as default confidence
          : [0.5], // If no evidence, use a default value
        evidence_min: -1.0,
        evidence_max: 1.0,
      }));

      // Construct edges array from all edges in the graph
      const requestEdges = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data.confidence || 0.5,
      }));

      const requestBody = {
        nodes: requestNodes,
        edges: requestEdges,
        lambda: 0.7,
        epsilon: 0.01,
        max_iterations: 20,
        evidence_min: -1.0,
        evidence_max: 1.0,
      };

      console.log(
        "Sending request body:",
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch("/api/ai/get-claim-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to fetch credibility.";
        try {
          const errorData = await response.json();
          if (response.status === 422 && errorData.detail) {
            errorMsg =
              "Invalid request format. Please ensure nodes and edges are provided.";
          } else if (errorData.detail) {
            errorMsg =
              typeof errorData.detail === "string"
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
      const nodeIdToText = Object.fromEntries(
        nodes.map((node) => [node.id, node.data.text])
      );
      // Build a readable string for the scores, tabbed and rounded to 5 decimal places, with node text in quotes
      const scoresList = Object.entries(data.final_scores)
        .map(
          ([id, score]) =>
            `"${nodeIdToText[id] ? nodeIdToText[id] : id}"\t${(
              score as number
            ).toFixed(5)}`
        )
        .join("<br />");
      const credibilityMessages = Object.entries(data.final_scores).map(
        ([id, score]) => ({
          role: "ai",
          content: {
            "Claim Node ID": id,
            "Claim Text": nodeIdToText[id] ? nodeIdToText[id] : id,
            "Final Credibility Score": (score as number).toFixed(5),
          },
          isStructured: true,
        })
      );
      setCopilotMessages((msgs) => [...msgs, ...credibilityMessages]);
    } catch (err: any) {
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: "system", content: `Error: ${err.message}` },
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
      {
        role: "user",
        content: "Check evidence for each claim and evaluate relationship.",
      },
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
      const response = await fetch("/api/ai/check-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const claimText = claimNode ? claimNode.data.text : "";
        const evidenceObj = evidenceCards.find(
          (ev) => ev.id === result.evidence_id
        );
        const evidenceTitle = evidenceObj ? evidenceObj.title : "";
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: {
              "Claim Node ID": result.node_id,
              Claim: claimText,
              "Evidence ID": result.evidence_id,
              "Evidence Title": evidenceTitle,
              Evaluation: result.evaluation,
              Reasoning: result.reasoning,
              Confidence: `${Math.round(result.confidence * 100)}%`,
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
        if (!nodeConfidenceMap[result.node_id])
          nodeConfidenceMap[result.node_id] = [];
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
        { role: "ai", content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleUpdateEvidenceConfidence = (
    evidenceId: string,
    confidence: number
  ) => {
    setEvidenceCards((prev) =>
      prev.map((ev) => (ev.id === evidenceId ? { ...ev, confidence } : ev))
    );
  };

  const pdfPreviewerRef = useRef<PDFPreviewerHandle>(null);

  // Place these at the top level of GraphCanvasInner (with other hooks):
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Add state for API queue and processing
  const [apiQueue, setApiQueue] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const prevSelectedNodeRef = useRef<ClaimNode | null>(null);

  // Detect node deselect and queue API call
  useEffect(() => {
    if (
      prevSelectedNodeRef.current?.id &&
      !selectedNode
    ) {
      const prevId = prevSelectedNodeRef.current.id;
      if (prevId) {
        setApiQueue((q) => [...q, prevId]);
      }
    }
    prevSelectedNodeRef.current = selectedNode || null;
  }, [selectedNode]);

  // Queue processor effect
  useEffect(() => {
    if (!isProcessing && apiQueue.length > 0) {
      setIsProcessing(true);
      const nodeId = apiQueue[0];
      triggerCheckNodeEvidence(nodeId).finally(() => {
        setApiQueue((q) => q.slice(1));
        setIsProcessing(false);
      });
    }
  }, [apiQueue, isProcessing]);

  // API call function for queued node evidence check
  const triggerCheckNodeEvidence = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const requestBody = {
      node: {
        id: node.id,
        text: node.data.text,
        type: node.data.type,
        evidenceIds: node.data.evidenceIds || [],
      },
      evidence: evidenceCards,
      supportingDocuments: supportingDocumentsRedux,
    };
    try {
      const response = await fetch("/api/ai/check-node-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        let errorMsg = "Failed to check evidence for node.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      // Output each result as a structured message (same as check_evidence)
      data.results.forEach((result: any) => {
        const claimNode = node;
        const claimText = claimNode ? claimNode.data.text : "";
        const evidenceObj = evidenceCards.find((ev) => ev.id === result.evidence_id);
        const evidenceTitle = evidenceObj ? evidenceObj.title : "";
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: {
              "Claim Node ID": result.node_id,
              Claim: claimText,
              "Evidence ID": result.evidence_id,
              "Evidence Title": evidenceTitle,
              Evaluation: result.evaluation,
              Reasoning: result.reasoning,
              Confidence: `${Math.round(result.confidence * 100)}%`,
            },
            isStructured: true,
          },
        ]);
      });
      // Update evidence confidences for the node's evidence
      setEvidenceCards((prevEvidence) =>
        prevEvidence.map((ev) => {
          const found = data.results.find((r: any) => r.evidence_id === ev.id);
          if (found) {
            return { ...ev, confidence: found.confidence };
          }
          return ev;
        })
      );
      // Use updated confidences from API response to update node belief
      const updatedConfidences = (node.data.evidenceIds || [])
        .map((eid) => {
          const found = data.results.find((r: any) => r.evidence_id === eid);
          return found ? found.confidence : undefined;
        })
        .filter((c) => typeof c === 'number');
      const avgConfidence =
        updatedConfidences.length > 0
          ? updatedConfidences.reduce((a, b) => a + b, 0) / updatedConfidences.length
          : 0.5;
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === node.id
            ? {
              ...n,
              data: {
                ...n.data,
                belief: avgConfidence,
              },
            }
            : n
        )
      );
    } catch (err: any) {
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: `<span class='text-red-600'>Error: ${err.message}</span>`,
        },
      ]);
    }
  };

  // Add this handler in GraphCanvasInner:
  const handleClearCopilotChat = () => {
    setCopilotMessages([]); // Only clear chat messages, not the CommandMessageBox buttons
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
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-4 relative">
                    <h2 className="text-lg font-semibold mb-3">Add Evidence</h2>
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
                      className="space-y-3"
                    >
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium mb-0.5">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9] text-sm"
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
                        <label className="block text-sm font-medium mb-0.5">
                          Supporting Document
                        </label>
                        <select
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9] text-sm"
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
                      {/* Excerpt/Lines and PDF Preview side by side */}
                      {(() => {
                        const doc = supportingDocuments.find(
                          (d) => d.id === newEvidence.supportingDocId
                        );
                        if (doc && doc.type === "document") {
                          const isPDF = doc.url.toLowerCase().endsWith(".pdf");
                          return (
                            <div className="flex flex-row gap-4 items-stretch">
                              {/* PDF Previewer on the left */}
                              {isPDF && (
                                <div
                                  className="flex flex-col"
                                  style={{
                                    width: 350,
                                    minWidth: 350,
                                    maxWidth: 350,
                                  }}
                                >
                                  <label className="block text-sm font-medium mb-0.5">
                                    Document Preview
                                  </label>
                                  <PDFPreviewer
                                    ref={pdfPreviewerRef}
                                    url={doc.url}
                                    onAddContent={() => { }}
                                    fixedWidth={350}
                                  />
                                </div>
                              )}
                              {/* Centered Add Content button */}
                              <div className="flex flex-col justify-center items-center px-2">
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-[#F3F4F6] hover:bg-[#1A2330] text-base font-medium whitespace-pre-line text-center"
                                  onClick={() => {
                                    const selectedText =
                                      pdfPreviewerRef.current?.getSelectedText() ||
                                      "";
                                    if (selectedText.trim()) {
                                      setNewEvidence((ev) => ({
                                        ...ev,
                                        excerpt: ev.excerpt
                                          ? ev.excerpt + "\n" + selectedText
                                          : selectedText,
                                      }));
                                    } else {
                                      alert(
                                        "Please select some text in the PDF preview first."
                                      );
                                    }
                                  }}
                                >
                                  {`Add\nContent`}
                                </button>
                              </div>
                              {/* Excerpt/Lines on the right */}
                              <div className="w-1/2">
                                <label className="block text-sm font-medium mb-0.5">
                                  Excerpt / Lines
                                </label>
                                <textarea
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9] min-h-[450px] text-med"
                                  placeholder="Paste or type the relevant excerpt or lines here... Alternatively, select text from the preview and click 'Add Content' to add it to the excerpt."
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
                            </div>
                          );
                        }
                        if (doc && doc.type === "image") {
                          return (
                            <div className="flex flex-row gap-4 items-stretch">
                              {/* Image Previewer on the left */}
                              <div
                                className="flex flex-col"
                                style={{
                                  width: 400,
                                  minWidth: 400,
                                  maxWidth: 400,
                                }}
                              >
                                <label className="block text-sm font-medium mb-0.5">
                                  Image Preview
                                </label>
                                <ImagePreviewer
                                  url={doc.url}
                                  fixedWidth={400}
                                />
                              </div>
                              {/* Centered Parse Text button */}
                              <div className="flex flex-col justify-center items-center px-2">
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-[#F3F4F6] hover:bg-[#1A2330] text-base font-medium whitespace-pre-line text-center"
                                  disabled={parseLoading}
                                  onClick={async () => {
                                    setParseError(null);
                                    setParseLoading(true);
                                    try {
                                      console.log(
                                        "[Parse Text] Starting OCR for image URL:",
                                        doc.url
                                      );
                                      let text = "";
                                      let response = await fetch(
                                        "/api/ai/extract-text-from-image",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            url: doc.url,
                                          }),
                                        }
                                      );
                                      console.log(
                                        "[Parse Text] OCR response:",
                                        response
                                      );
                                      if (!response.ok) {
                                        const errText = await response.text();
                                        console.error(
                                          "[Parse Text] OCR failed:",
                                          errText
                                        );
                                        throw new Error(
                                          "Failed to extract text from image"
                                        );
                                      }
                                      const data = await response.json();
                                      text = data.text?.trim() || "";
                                      // If no text detected, ask for a description
                                      if (!text || text.length < 3) {
                                        console.log(
                                          "[Parse Text] No text detected, requesting image description for URL:",
                                          doc.url
                                        );
                                        response = await fetch(
                                          "/api/ai/extract-text-from-image?summarize=true",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              url: doc.url,
                                            }),
                                          }
                                        );
                                        console.log(
                                          "[Parse Text] Description response:",
                                          response
                                        );
                                        if (!response.ok) {
                                          const errText = await response.text();
                                          console.error(
                                            "[Parse Text] Description failed:",
                                            errText
                                          );
                                          throw new Error(
                                            "Failed to get image description"
                                          );
                                        }
                                        const descData = await response.json();
                                        text =
                                          descData.text?.trim() ||
                                          "No text or description could be extracted.";
                                      }
                                      setNewEvidence((ev) => ({
                                        ...ev,
                                        excerpt: text,
                                      }));
                                      console.log(
                                        "[Parse Text] Final extracted text/description:",
                                        text
                                      );
                                    } catch (err: any) {
                                      setParseError(
                                        err.message || "Failed to parse image."
                                      );
                                      console.error("[Parse Text] Error:", err);
                                    } finally {
                                      setParseLoading(false);
                                    }
                                  }}
                                >
                                  {parseLoading ? "Parsing..." : `Parse\nText`}
                                </button>
                                {parseError && (
                                  <div className="text-red-500 text-xs mt-2">
                                    {parseError}
                                  </div>
                                )}
                              </div>
                              {/* Excerpt/Lines on the right */}
                              <div className="w-1/2">
                                <label className="block text-sm font-medium mb-0.5">
                                  Excerpt / Lines
                                </label>
                                <textarea
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9] min-h-[450px] text-med"
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
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-3 items-center">
                        <div className="flex-1"></div>
                        {/* Add Content button will be rendered here if needed by PDFPreviewer */}
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
            {!hideNavbar && (
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
                        className="bg-transparent border-b border-gray-300 focus:border-[#7283D9] outline-none px-0.5 text-lg text-center w-full"
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: "390",
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => setIsEditing(true)}
                        className="cursor-pointer hover:bg-gray-100 px-0.5 py-0 rounded text-lg text-center w-full"
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: "390",
                        }}
                      >
                        {title}
                      </span>
                    )}
                  </div>

                  <div className="h-10 w-px bg-gray-200 mx-3 my-auto"></div>

                  {/* Menu Button */}
                  <div
                    className="relative flex items-center -ml-4"
                    ref={menuRef}
                  >
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
            )}

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
                      className="w-full text-left px-5 py-2.5 text-[#3A4553] hover:bg-[#3A4553] hover:text-white text-xl transition-colors"
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
                <ArrowTrendingUpIcon className="w-8 h-8" strokeWidth={2} />
              </button>

              <button
                onClick={() => setSelectedEdgeType("attacking")}
                className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${selectedEdgeType === "attacking"
                  ? "bg-[#991B1B] bg-opacity-20 text-[#991B1B]"
                  : "text-gray-700 hover:bg-gray-100"
                  }`}
                title="Attacking Edge"
              >
                <ArrowTrendingDownIcon className="w-8 h-8" strokeWidth={2} />
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
              onEdgeClick={handleEdgeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              minZoom={0.25}
              maxZoom={2.5}
              className="bg-white h-full [--xy-theme-selected:#f57dbd] [--xy-theme-hover:#c5c5c5] [--xy-theme-color-focus:#e8e8e8]"
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
              <Background variant={BackgroundVariant.Dots} />
              <Controls className="!hidden" />
            </ReactFlow>

            {/* Properties Modal beside AI Copilot */}
            {(selectedNode || selectedEdge) && (
              <div
                style={{
                  position: "fixed",
                  top: 80, // adjust as needed
                  right: isAICopilotOpen ? "27vw" : 0, // leave space for Copilot if open
                  zIndex: 50,
                  width: 270,
                  maxWidth: "67.5vw",
                  background: "white",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
                  borderRadius: 16,
                  border: "1px solid #eee",
                  padding: 0,
                  transition: "right 0.3s",
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
                    copilotOpen={isAICopilotOpen}
                  />
                )}
                {selectedEdge && !selectedNode && (
                  <EdgeProperties
                    edge={selectedEdge}
                    onClose={() => setSelectedEdge(null)}
                    onUpdate={handleEdgeUpdate}
                    copilotOpen={isAICopilotOpen}
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
                    onClick={() => setIsAICopilotFrozen((f) => !f)}
                    className={`p-2 rounded-full transition-colors ${isAICopilotFrozen ? "bg-gray-200" : "hover:bg-gray-100"
                      }`}
                    title={
                      isAICopilotFrozen
                        ? "Unfreeze Copilot Panel"
                        : "Freeze Copilot Panel"
                    }
                  >
                    {isAICopilotFrozen ? (
                      <LockClosedIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <LockOpenIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      !isAICopilotFrozen && setIsAICopilotOpen(false)
                    }
                    className={`p-2 hover:bg-white rounded-md transition-colors ${isAICopilotFrozen ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    aria-label="Close AI copilot"
                    disabled={isAICopilotFrozen}
                  >
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-auto p-4">
                <div className="text-center text-gray-500 mt-2 mb-2">
                  AI Copilot is ready to assist with your graph.
                </div>
                <CommandMessageBox
                  title="Check Claim Evidence"
                  content="Check evidence for each claim and evaluate relationship"
                  icon={<DocumentMagnifyingGlassIcon className="w-6 h-6" />}
                  onClick={handleCheckEvidence}
                  disabled={copilotLoading}
                />
                <CommandMessageBox
                  title="Get Claim Credibility"
                  content="Compute credibility scores for each node using internal evidence scores, and apply propagation algorithm."
                  icon={<DocumentCheckIcon className="w-6 h-6" />}
                  onClick={handleClaimCredibility}
                  disabled={copilotLoading}
                />
                <div className="mt-4 space-y-2">
                  {copilotMessages.map((msg, idx) => (
                    <ChatBox key={idx}>
                      {msg.isStructured ? (
                        <MessageBox message={msg.content} />
                      ) : msg.role === "assistant" ? (
                        <span
                          className={`text-left text-sm text-blue-700`}
                          dangerouslySetInnerHTML={{ __html: msg.content }}
                        />
                      ) : (
                        <span
                          className={`text-left text-sm ${msg.role === "system"
                            ? "text-gray-500"
                            : "text-black"
                            }`}
                        >
                          {msg.content}
                        </span>
                      )}
                    </ChatBox>
                  ))}
                  {copilotLoading && (
                    <ChatBox>
                      <span className="text-purple-500 text-sm">
                        Analyzing claim credibility...
                      </span>
                    </ChatBox>
                  )}
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
                {/* ... existing code ... */}
                <div className="flex justify-center mt-2">
                  <button
                    onClick={handleClearCopilotChat}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium shadow-sm border border-gray-300 transition-all"
                    type="button"
                  >
                    Clear Chat
                  </button>
                </div>
                {/* ... existing code ... */}
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

const GraphCanvas = ({ hideNavbar = false }: GraphCanvasProps) => {
  return (
    <ReactFlowProvider>
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        }
      >
        <GraphCanvasInner hideNavbar={hideNavbar} />
      </Suspense>
    </ReactFlowProvider>
  );
};

export default GraphCanvas;
