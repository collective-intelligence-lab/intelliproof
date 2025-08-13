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
  getNodesBounds,
  useNodesInitialized,
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
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
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
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// Simple floppy disk outline icon for the Save action
const FloppyDiskIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x={7}
      y={3}
      width={8}
      height={6}
      rx={1}
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect
      x={9}
      y={13}
      width={6}
      height={6}
      rx={1}
      stroke="currentColor"
      strokeWidth={2}
    />
  </svg>
);
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
import NotesManagerModal, { Note } from "./NotesManagerModal";
import NoteEditorModal from "./NoteEditorModal";
import LoadingSuccessButton from "./LoadingSuccessButton";
import useUndoRedo from "../../hooks/useUndoRedo";
import {
  downloadActionLog,
  downloadApiLog,
  installFetchLogger,
  logAction,
} from "../../lib/actionLogger";

// Add score classification function
const getScoreClassification = (credibilityScore: number) => {
  if (credibilityScore >= -1.00 && credibilityScore <= -0.60) {
    return {
      label: "Very Low Confidence",
      color: "#dc2626", // red-600
      bgColor: "#fef2f2", // red-50
      borderColor: "#fecaca" // red-200
    };
  } else if (credibilityScore >= -0.59 && credibilityScore <= -0.20) {
    return {
      label: "Low Confidence",
      color: "#ea580c", // orange-600
      bgColor: "#fff7ed", // orange-50
      borderColor: "#fed7aa" // orange-200
    };
  } else if (credibilityScore >= -0.19 && credibilityScore <= 0.19) {
    return {
      label: "Neutral / Unknown",
      color: "#6b7280", // gray-500
      bgColor: "#f9fafb", // gray-50
      borderColor: "#d1d5db" // gray-200
    };
  } else if (credibilityScore >= 0.20 && credibilityScore <= 0.59) {
    return {
      label: "High Confidence",
      color: "#16a34a", // green-600
      bgColor: "#f0fdf4", // green-50
      borderColor: "#bbf7d0" // green-200
    };
  } else if (credibilityScore >= 0.60 && credibilityScore <= 1.00) {
    return {
      label: "Very High Confidence",
      color: "#15803d", // green-700
      bgColor: "#ecfdf5", // green-50
      borderColor: "#86efac" // green-300
    };
  }
  // Default fallback
  return {
    label: "Unknown",
    color: "#6b7280",
    bgColor: "#f9fafb",
    borderColor: "#d1d5db"
  };
};

const getNodeStyle: (type: string) => React.CSSProperties = (type) => {
  const getColors = (type: string) => {
    switch (type) {
      case "factual":
        return {
          background: "#eeeeee",
          header: "#aeaeae",
        };
      case "value":
        return {
          background: "#ecf4e4",
          header: "#94bc84",
        };
      case "policy":
        return {
          background: "#EAF0F7",
          header: "#91A4C2",
        };
      default:
        return {
          background: "#eeeeee",
          header: "#aeaeae",
        };
    }
  };

  const colors = getColors(type);

  return {
    backgroundColor: colors.background,
    color: "#000000",
    padding: "0 8px 4px 8px",
    fontFamily: "DM Sans, sans-serif",
    fontSize: "8px",
    cursor: "pointer",
    minWidth: "90px",
    maxWidth: "140px",
    width: "fit-content",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center" as const,
    transition: "all 200ms ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
    // border: "none",
    border: `1.2px solid ${colors.header}`,
    borderRadius: "3px",
  };
};

const CustomNode = ({ data, id, selected }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const CHARACTER_LIMIT = 200;

  const colors = (() => {
    switch (data.type) {
      case "factual":
        return {
          background: "#eeeeee",
          header: "#aeaeae",
        };
      case "value":
        return {
          background: "#ecf4e4",
          header: "#94bc84",
        };
      case "policy":
        return {
          background: "#EAF0F7",
          header: "#91A4C2",
        };
      default:
        return {
          background: "#eeeeee",
          header: "#aeaeae",
        };
    }
  })();

  // Get score classification
  const scoreClassification = getScoreClassification(data.credibilityScore || 0);

  // Sync localText with data.text when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalText(data.text);
    }
  }, [data.text, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setLocalText(data.text);
      setIsEditing(false);
    }
    e.stopPropagation();
  };

  // Drag and drop handlers for evidence
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const evidenceId = e.dataTransfer.getData("application/x-evidence-id");
    console.log(
      `[CustomNode handleDrop] Evidence ID: ${evidenceId}, Node ID: ${id}`
    );

    if (!evidenceId) {
      console.log(`[CustomNode handleDrop] No evidence ID found`);
      return;
    }

    console.log(
      `[CustomNode handleDrop] Calling onEvidenceDrop with evidenceId: ${evidenceId}`
    );
    // Call the onEvidenceDrop callback if it exists
    data.onEvidenceDrop?.(evidenceId);
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
      <div
        className={`flex flex-col w-full p-0 m-0 group relative transition-all duration-200 ${isDragOver ? "ring-2 ring-[#7283D9] ring-opacity-50 bg-[#F0F4FF]" : ""
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Score circle in top right */}
        <div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center z-10"
          style={{
            position: "absolute",
            top: "-4px",
            right: "-13px",
            width: "12px",
            height: "12px",
            fontSize: "4.5px",
            fontFamily: "DM Sans, sans-serif",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            borderColor: colors.header,
            fontWeight: "normal",
          }}
        >
          {typeof data.credibilityScore === "number"
            ? data.credibilityScore.toFixed(2)
            : "0.00"}
        </div>

        {/* Score Classification Bar - replacing the black line */}
        <div
          style={{
            position: "absolute",
            top: "-0.69px",
            left: "-8.4px",
            width: "fit-content",
            minWidth: "10px",
            maxWidth: "80px",
            height: "8px",
            backgroundColor: scoreClassification.bgColor,
            border: `1px solid ${scoreClassification.borderColor}`,
            borderBottomRightRadius: "3px",
            borderTopLeftRadius: "2px",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: scoreClassification.color,
            fontSize: "5px",
            fontWeight: "500",
            letterSpacing: "0.01em",
            fontFamily: "DM Sans, sans-serif",
            padding: "2px 4px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={scoreClassification.label}
        >
          {scoreClassification.label}
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
            fontWeight: "400",
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={localText}
              onChange={(e) => {
                const newText = e.target.value;
                setLocalText(newText);
                // Save changes immediately while typing
                data.onChange?.(newText);
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent outline-none border-b border-gray-300"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "8px",
                fontWeight: "400",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div>
              <div className="w-full break-words text-[8px]">
                {truncateText(data.text || "Click to edit")}
              </div>
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

  const updateCredibilityScores = async () => {
    // Don't run if there are no nodes
    if (nodes.length === 0) return;

    try {
      setCopilotLoading(true); // Show loading state
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "user",
          content: "Computing credibility scores for all claims...",
        },
      ]);

      const requestBody = {
        nodes: nodes.map((node) => ({
          id: node.id,
          evidence:
            Array.isArray(node.data.evidenceIds) &&
              node.data.evidenceIds.length > 0
              ? node.data.evidenceIds.map((evId) => {
                const evidenceCard = evidenceCards.find(
                  (card) => card.id === evId
                );
                return evidenceCard ? evidenceCard.confidence : 0;
              })
              : [],
          evidence_min: -1.0,
          evidence_max: 1.0,
        })),
        edges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          weight: edge.data.confidence || 0,
        })),
        lambda: 0.7,
        epsilon: 0.01,
        max_iterations: 20,
        evidence_min: -1.0,
        evidence_max: 1.0,
      };

      const response = await fetch("/api/ai/get-claim-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to update credibility scores");
      }

      const data = await response.json();

      // Update node scores
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            // belief: data.final_scores[node.id] || node.data.belief,
            // belief: data.final_scores[node.id],
            credibilityScore: data.final_scores[node.id],
          },
        }))
      );

      // Display results in copilot
      const nodeIdToText = Object.fromEntries(
        nodes.map((node) => [node.id, node.data.text])
      );

      const credibilityMessages = Object.entries(data.final_scores).map(
        ([id, score]) => ({
          role: "ai",
          content: {
            "Claim Node ID": id,
            "Node Title": nodeIdToText[id] ? nodeIdToText[id] : id,
            "Claim Text": nodeIdToText[id] ? nodeIdToText[id] : id,
            "Final Credibility Score": (score as number).toFixed(5),
          },
          isStructured: true,
        })
      );

      setCopilotMessages((msgs) => [...msgs, ...credibilityMessages]);
    } catch (error) {
      console.error("Error updating credibility scores:", error);
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "system",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"
            }`,
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ClaimNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ClaimEdge | null>(null);
  // Edge creation type toggle for initial edge color
  const [edgeCreationType, setEdgeCreationType] =
    useState<EdgeType>("supporting");
  const { project } = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo({
    maxHistorySize: 200,
    enableShortcuts: true,
  });
  const reactFlowInstance = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const didInitViewportRef = useRef(false);
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
    selectedNodeId: "",
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

  // Install global fetch logger for this component lifecycle
  useEffect(() => {
    const uninstall = installFetchLogger(() => ({
      userId: profile?.user_id,
      graphId: currentGraphId,
    }));
    return uninstall;
  }, [profile?.user_id, currentGraphId]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Track AI Copilot width to position property panels without overlap
  const copilotRef = useRef<HTMLDivElement | null>(null);
  const [copilotWidthPx, setCopilotWidthPx] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  useEffect(() => {
    if (!copilotRef.current) return;
    const el = copilotRef.current;
    const update = () =>
      setCopilotWidthPx(isAICopilotOpen ? el.offsetWidth : 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isAICopilotOpen]);
  const [isAICopilotFrozen, setIsAICopilotFrozen] = useState(false);

  // Notes state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Text Area Modal state
  const [isTextAreaModalOpen, setIsTextAreaModalOpen] = useState(false);
  const [textAreaContent, setTextAreaContent] = useState("");



  const fetchNotes = useCallback(
    async (graphIdParam?: string) => {
      const gid = graphIdParam || currentGraphId;
      if (!gid) return;
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`/api/notes?graph_id=${gid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotes(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to fetch notes", e);
      }
    },
    [currentGraphId]
  );

  useEffect(() => {
    if (currentGraphId) fetchNotes(currentGraphId);
  }, [currentGraphId, fetchNotes]);

  const openNotesManager = () => {
    setIsNotesOpen(true);
    fetchNotes();
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsNoteEditorOpen(true);
  };

  const handleEditNote = (n: Note) => {
    setEditingNote(n);
    setIsNoteEditorOpen(true);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Delete note failed", e);
    }
  };

  const handleSaveNote = async ({
    title,
    text,
    url,
  }: {
    title: string;
    text: string;
    url?: string;
  }) => {
    const token = localStorage.getItem("access_token");
    if (!token || !currentGraphId) return;
    try {
      if (editingNote) {
        const res = await fetch(`/api/notes/${editingNote.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, text, url }),
        });
        if (res.ok) {
          const { note } = await res.json();
          setNotes((prev) =>
            prev.map((n) => (n.id === editingNote.id ? note : n))
          );
        }
      } else {
        const res = await fetch(`/api/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ graph_id: currentGraphId, title, text, url }),
        });
        if (res.ok) {
          const { note } = await res.json();
          setNotes((prev) => [note, ...prev]);
        }
      }
    } catch (e) {
      console.error("Save note failed", e);
    }
  };

  // Add state for loading OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Add state for AI evidence suggestion
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Add state for extract all text functionality
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

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
              belief: nodeData.belief ?? 0,
              credibilityScore: nodeData.credibilityScore ?? 0,
              created_on: nodeData.created_on || new Date().toISOString(),
              onChange: (newText: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, text: newText } }
                      : n
                  )
                );
                // Also update selectedNode if this node is selected
                setSelectedNode((currentSelected) =>
                  currentSelected?.id === node.id
                    ? {
                      ...currentSelected,
                      data: { ...currentSelected.data, text: newText },
                    }
                    : currentSelected
                );
                // Mark node as modified for API calls
                setModifiedNodes(
                  (prev) => new Set(Array.from(prev).concat(node.id))
                );
              },
              evidenceIds: nodeData.evidenceIds || [],
              onEvidenceDrop: (evidenceId: string) => {
                handleNodeEvidenceDrop(node.id, evidenceId);
              },
            },
            style: getNodeStyle(nodeData.type || node.type), // Always use getNodeStyle
          };
        }
      );

      // Transform edges to include required ReactFlow properties
      const formattedEdges = (currentGraph.graph_data?.edges || []).map(
        (edge) => {
          let edgeType: EdgeType = "supporting";
          let confidence: number = 0;
          let edgeScore: number | undefined;
          let reasoning: string | undefined;

          // Check if edge has saved validation data (from saved graph)
          if ("edgeScore" in edge && edge.edgeScore !== undefined) {
            edgeType = (edge as any).edgeType || "supporting";
            confidence = (edge as any).confidence ?? 0;
            edgeScore = (edge as any).edgeScore;
            reasoning = (edge as any).reasoning;

            // Add debug logging
            console.log(`Loading edge ${edge.id}:`, {
              edgeType,
              confidence,
              edgeScore,
              reasoning,
              originalEdge: edge,
            });
          } else if ("data" in edge && edge.data) {
            // If edge is a ClaimEdge (has 'data'), use its data
            edgeType = edge.data.edgeType || "supporting";
            confidence = edge.data.confidence ?? 0;
            edgeScore = edge.data.edgeScore ?? 0;
            reasoning = edge.data.reasoning;
          } else if ("weight" in edge && typeof edge.weight === "number") {
            // Legacy or exported edge
            confidence = edge.weight;
            edgeType = edge.weight >= 0 ? "supporting" : "attacking";
            edgeScore = edge.weight; // Use weight as edgeScore for legacy edges
            reasoning = edge.data.reasoning;
          }

          // Determine edge color based on score sign when available; fallback to type
          const scoreForColor = typeof edgeScore === "number" ? edgeScore : 0;
          let edgeColor = scoreForColor < 0 ? "#991B1B" : "#166534";

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "custom" as const,
            data: {
              edgeType,
              confidence,
              edgeScore,
              reasoning,
            },
            markerStart: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
          };
        }
      );

      console.log("Formatted nodes:", formattedNodes); // Debug log
      console.log("Formatted edges:", formattedEdges); // Debug log

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      // After nodes/edges are set, we'll let the nodes initialize and handle viewport in a separate effect
    }
  }, [currentGraph]);

  // Once nodes are initialized in the viewport, fit to bounds and then center/zoom
  useEffect(() => {
    if (!nodesInitialized || didInitViewportRef.current) return;
    if (nodes.length === 0) return;
    didInitViewportRef.current = true;

    try {
      const bounds = getNodesBounds(reactFlowInstance.getNodes());
      console.log("[GraphCanvas] nodesInitialized → bounds", bounds);
      (async () => {
        try {
          await reactFlowInstance.fitBounds(bounds, { padding: 0.08 });
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const zoom = 1.0; // tweak as desired
          // Pan a bit to the right to compensate the evidence sidebar
          const panPixels = 450; // screen pixels to shift to the right on load
          const panXFlow = panPixels / zoom;
          await reactFlowInstance.setCenter(centerX - panXFlow, centerY, {
            zoom,
            duration: 0,
          });
          console.log("[GraphCanvas] setCenter with pan offset", {
            zoom,
            panPixels,
            panXFlow,
          });
        } catch (e) {
          console.warn("[GraphCanvas] viewport init failed", e);
        }
      })();
    } catch (e) {
      console.warn("[GraphCanvas] nodesInitialized viewport sequence error", e);
    }
  }, [nodesInitialized, nodes, reactFlowInstance]);

  // Load evidence from graph_data when currentGraph changes
  useEffect(() => {
    if (currentGraph?.graph_data?.evidence) {
      setEvidenceCards(
        currentGraph.graph_data.evidence.map((ev) => ({
          ...ev,
          confidence: typeof ev.confidence === "number" ? ev.confidence : 0,
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

  // Add state to track newly created nodes that need classification
  const [newlyCreatedNodes, setNewlyCreatedNodes] = useState<Set<string>>(
    new Set()
  );

  const addNode = (type: ClaimType) => {
    takeSnapshot();
    logAction("add_node", { type }, profile?.user_id);
    console.log(
      `[GraphCanvas] addNode: Starting node creation with type: ${type}`
    );

    const newNode = {
      ...createClaimNode("new claim", type),
      data: {
        ...createClaimNode("new claim", type).data,
        text: "new claim",
        author: profile?.email || "Anonymous",
        onChange: (newText: string) => {
          console.log(
            `[GraphCanvas] addNode: onChange triggered for node ${newNode.id} with text: "${newText}"`
          );
          // Use setNodes to update the node directly since it might not be in state yet
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNode.id
                ? { ...node, data: { ...node.data, text: newText } }
                : node
            )
          );
          // Also update selectedNode if this node is selected
          setSelectedNode((currentSelected) =>
            currentSelected?.id === newNode.id
              ? {
                ...currentSelected,
                data: { ...currentSelected.data, text: newText },
              }
              : currentSelected
          );
          // Mark node as modified for API calls
          setModifiedNodes(
            (prev) => new Set(Array.from(prev).concat(newNode.id))
          );
        },
        onEvidenceDrop: (evidenceId: string) => {
          handleNodeEvidenceDrop(newNode.id, evidenceId);
        },
      },
      style: getNodeStyle(type), // Explicitly set the style
    };

    setNodes((nds) => [...nds, newNode]);
    setIsAddNodeOpen(false);
    console.log(
      `[GraphCanvas] addNode: Successfully created new node ${newNode.id} with type ${type}`
    );
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === "remove" || c.type === "position")) {
        takeSnapshot();
        logAction("nodes_change", { changes }, profile?.user_id);
      }
      // Check for node deletions and trigger credibility for affected nodes
      changes.forEach((change) => {
        if (change.type === "remove" && change.id) {
          // Find all edges where the deleted node was the TARGET
          // (i.e., edges pointing TO the deleted node)
          const edgesToDeletedNode = edges.filter(
            (edge) => edge.target === change.id
          );

          // Collect source nodes that were pointing to the deleted node
          const affectedNodeIds = edgesToDeletedNode.map((edge) => edge.source);

          // Queue affected nodes for credibility updates
          if (affectedNodeIds.length > 0) {
            console.log(
              `[GraphCanvas] onNodesChange: Node ${change.id} deleted, triggering credibility for source nodes:`,
              affectedNodeIds
            );
            setApiQueue((q) => [...q, ...affectedNodeIds]);
          }

          // Also remove the deleted node from the queue if it's already there
          setApiQueue((q) => q.filter((id) => id !== change.id));
        }
      });

      setNodes((nds) => applyNodeChanges(changes, nds) as ClaimNode[]);
    },
    [edges]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === "remove")) {
        takeSnapshot();
        logAction("edges_change", { changes }, profile?.user_id);
      }
      // Check for edge deletions and trigger credibility for affected nodes
      changes.forEach((change) => {
        if (change.type === "remove" && change.id) {
          // Find the edge that was deleted to get its target node
          const deletedEdge = edges.find((e) => e.id === change.id);
          if (deletedEdge && deletedEdge.target) {
            console.log(
              `[GraphCanvas] onEdgesChange: Edge ${change.id} deleted, triggering credibility for target node ${deletedEdge.target}`
            );
            setApiQueue((q) => [...q, deletedEdge.target]);
          }
        }
      });

      setEdges((eds) => applyEdgeChanges(changes, eds) as ClaimEdge[]);
    },
    [edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      logAction(
        "add_edge",
        { source: params.source, target: params.target },
        profile?.user_id
      );
      connectionCompleted.current = true; // Mark that a connection was made
      // Check if an edge already exists between these nodes
      const edgeExists = edges.some(
        (edge) =>
          (edge.source === params.source && edge.target === params.target) ||
          (edge.source === params.target && edge.target === params.source)
      );

      // If edge exists, don't create a new one
      if (edgeExists) return;

      const isAttacking = edgeCreationType === "attacking";
      const newEdge: ClaimEdge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: "custom" as const,
        data: {
          edgeType: edgeCreationType,
          confidence: 0,
          // tiny negative score for attacking so it renders red immediately; 0 for supporting
          edgeScore: isAttacking ? -0.01 : 0,
          reasoning: "",
        },
        markerStart: {
          type: MarkerType.ArrowClosed,
          color: isAttacking ? "#991B1B" : "#166534",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds) as ClaimEdge[]);

      // Auto-validate the new edge to get reasoning
      setTimeout(() => {
        setEdgeApiQueue((q) => [...q, newEdge.id]);
      }, 100); // Small delay to ensure edge is fully added

      // Trigger credibility calculation for the target node only
      console.log(
        `[GraphCanvas] onConnect: Edge created between ${params.source} and ${params.target}, triggering credibility for target node ${params.target}`
      );

      // Queue only the target node for credibility calculation
      setApiQueue((q) => [...q, params.target!]);
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
          ...createClaimNode("new claim", "factual"),
          position,
          data: {
            ...createClaimNode("new claim", "factual").data,
            text: "new claim",
            onChange: (newText: string) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === newNode.id
                    ? { ...n, data: { ...n.data, text: newText } }
                    : n
                )
              );
              // Also update selectedNode if this node is selected
              setSelectedNode((currentSelected) =>
                currentSelected?.id === newNode.id
                  ? {
                    ...currentSelected,
                    data: { ...currentSelected.data, text: newText },
                  }
                  : currentSelected
              );
              // Mark node as modified for API calls
              setModifiedNodes(
                (prev) => new Set(Array.from(prev).concat(newNode.id))
              );
            },
          },
          style: getNodeStyle("factual"), // Explicitly set the style
        };

        // Create the edge between the nodes
        const isAttackingNew = edgeCreationType === "attacking";
        const newEdge: ClaimEdge = {
          id: `e${connectingNodeId}-${newNode.id}`,
          source:
            connectingHandleType === "source" ? connectingNodeId : newNode.id,
          target:
            connectingHandleType === "source" ? newNode.id : connectingNodeId,
          type: "custom" as const,
          data: {
            edgeType: edgeCreationType,
            confidence: 0,
            edgeScore: isAttackingNew ? -0.01 : 0,
          },
          markerStart: {
            type: MarkerType.ArrowClosed,
            color: isAttackingNew ? "#991B1B" : "#166534",
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
    console.log(
      `[GraphCanvas] handleNodeUpdate: Called for node ${nodeId} with updates:`,
      updates
    );

    // Check if this is a meaningful change
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log(
        `[GraphCanvas] handleNodeUpdate: Node ${nodeId} not found, returning`
      );
      return;
    }

    const hasContentChange =
      updates.data?.text !== undefined && updates.data.text !== node.data.text;
    const hasTypeChange =
      updates.data?.type !== undefined && updates.data.type !== node.data.type;
    const hasEvidenceChange =
      updates.data?.evidenceIds !== undefined &&
      JSON.stringify(updates.data.evidenceIds) !==
      JSON.stringify(node.data.evidenceIds);

    console.log(
      `[GraphCanvas] handleNodeUpdate: Change detection - content: ${hasContentChange}, type: ${hasTypeChange}, evidence: ${hasEvidenceChange}`
    );

    // Mark node as modified if there are meaningful changes
    if (hasContentChange || hasTypeChange || hasEvidenceChange) {
      setModifiedNodes((prev) => new Set(Array.from(prev).concat(nodeId)));
      console.log(
        `[GraphCanvas] handleNodeUpdate: Marked node ${nodeId} as modified`
      );
    }

    setNodes((nds) => {
      console.log("Updating nodes state for nodeId:", nodeId);
      console.log(
        "Current nodes before update:",
        nds.map((n) => ({ id: n.id, text: n.data.text }))
      );
      return nds.map((node) => {
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
          const updatedData = {
            ...node.data,
            ...updates.data,
          };

          const updatedNode = {
            ...node,
            ...updates,
            data: {
              ...updatedData,
              onChange: (newText: string) => {
                // Update the node directly using setNodes
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === nodeId
                      ? { ...n, data: { ...n.data, text: newText } }
                      : n
                  )
                );
                // Also update selectedNode if this node is selected
                setSelectedNode((currentSelected) =>
                  currentSelected?.id === nodeId
                    ? {
                      ...currentSelected,
                      data: { ...currentSelected.data, text: newText },
                    }
                    : currentSelected
                );
                // Mark node as modified for API calls
                setModifiedNodes(
                  (prev) => new Set(Array.from(prev).concat(nodeId))
                );
              },
              onEvidenceDrop: (evidenceId: string) => {
                handleNodeEvidenceDrop(nodeId, evidenceId);
              },
            },
            style: getNodeStyle(updates.data?.type || node.data.type), // Always use getNodeStyle
          };
          if (selectedNode?.id === nodeId) {
            setSelectedNode(updatedNode);
          }
          console.log("Updated node:", {
            id: updatedNode.id,
            text: updatedNode.data.text,
          });
          return updatedNode;
        }
        return node;
      });
    });

    // Log the nodes state after the update
    setTimeout(() => {
      console.log(
        "Nodes state after update:",
        nodes.map((n) => ({ id: n.id, text: n.data.text }))
      );
    }, 0);
  };

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge as ClaimEdge);
  };

  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdge) return;
    takeSnapshot();
    logAction("delete_edge", { edgeId: selectedEdge.id }, profile?.user_id);
    const edgeToDelete = selectedEdge;
    setEdges((eds) => eds.filter((e) => e.id !== edgeToDelete.id));
    setSelectedEdge(null);
    // Trigger credibility recalculation for the edge's target node
    if (edgeToDelete.target) {
      setApiQueue((q) => [...q, edgeToDelete.target]);
    }
  }, [selectedEdge]);

  const handleEdgeUpdate = (edgeId: string, updates: Partial<ClaimEdge>) => {
    takeSnapshot();
    logAction("update_edge", { edgeId, updates }, profile?.user_id);
    // Find the edge to get source and target nodes
    const edge = edges.find((e) => e.id === edgeId);

    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edgeId) {
          // Get the updated edge data
          const updatedData = {
            ...e.data,
            ...updates.data,
          };

          // Determine edge color based on score sign when available; fallback to type
          const scoreForColor =
            typeof updatedData.edgeScore === "number"
              ? updatedData.edgeScore
              : undefined;
          let edgeColor =
            scoreForColor !== undefined
              ? scoreForColor < 0
                ? "#991B1B"
                : "#166534"
              : updatedData.edgeType === "attacking"
                ? "#991B1B"
                : "#166534";

          const updatedEdge = {
            ...e,
            ...updates,
            data: updatedData,
            markerStart: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
          };
          // If this edge is currently selected, refresh selectedEdge so UI updates (e.g., Reasoning)
          if (selectedEdge && selectedEdge.id === edgeId) {
            setSelectedEdge(updatedEdge as ClaimEdge);
          }
          return updatedEdge;
        }
        return e;
      })
    );

    // If edge was found and has source/target, trigger credibility for target node
    // (target node depends on source node, so changes to edge affect target)
    if (edge && edge.target) {
      console.log(
        `[GraphCanvas] handleEdgeUpdate: Edge ${edgeId} updated, triggering credibility for target node ${edge.target}`
      );
      setApiQueue((q) => [...q, edge.target]);
    }
  };

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      takeSnapshot();
      logAction("delete_node", { nodeId: selectedNode.id }, profile?.user_id);
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
      setSelectedEdge(null);
    }
  }, [selectedNode]);

  // Global keyboard handler: Backspace/Delete deletes selected edge first, then node
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        !!target &&
        ((target as any).isContentEditable ||
          tag === "input" ||
          tag === "textarea");
      if (isEditable) return; // don't interfere with typing

      if (selectedEdge) {
        e.preventDefault();
        handleDeleteEdge();
      } else if (selectedNode) {
        e.preventDefault();
        handleDeleteNode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEdge, selectedNode, handleDeleteEdge, handleDeleteNode]);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const handleSave = async () => {
    logAction(
      "save_graph",
      { graphId: currentGraphId || currentGraph?.id },
      profile?.user_id
    );
    // Add debug logging
    console.log("Current graph ID:", currentGraphId);
    console.log("Current graph:", currentGraph);

    // Get the graph ID from either source
    const graphId = currentGraphId || currentGraph?.id;

    if (!graphId) {
      console.error("No graph ID found for saving");
      throw new Error("Cannot save: No graph ID found");
    }

    // Format the graph data according to the required structure
    const graphData = {
      evidence: evidenceCards,
      nodes: nodes.map((node) => ({
        id: node.id,
        text: node.data.text,
        type: node.data.type,
        author: node.data.author,
        credibilityScore: node.data.credibilityScore,
        belief: clamp(node.data.belief ?? 0.5, 0, 1),
        position: node.position,
        created_on: node.data.created_on || new Date().toISOString(),
        evidenceIds: node.data.evidenceIds || [],
      })),
      edges: edges.map((edge) => {
        const edgeData = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: clamp(edge.data.confidence, -1, 1),
          // Save edge validation data
          edgeType: edge.data.edgeType,
          confidence: edge.data.confidence,
          edgeScore: edge.data.edgeScore,
          reasoning: edge.data.reasoning,
        };

        // Add debug logging
        console.log(`Saving edge ${edge.id}:`, edgeData);

        return edgeData;
      }),
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
  };

  // Handler for successful upload
  const handleUploadSuccess = (doc: SupportingDocument) => {
    if (currentGraphId) {
      dispatch(fetchSupportingDocuments(currentGraphId));
    }
    setIsUploadModalOpen(false);
  };

  const handleUpload = async () => {
    setIsUploadModalOpen(true);
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
    setNewEvidence({
      title: "",
      supportingDocId: "",
      selectedNodeId: "",
      excerpt: "",
    });
  };

  // Handle AI evidence suggestion
  const handleSuggestContent = async () => {
    if (!newEvidence.selectedNodeId) {
      alert("Please select an Associated Node to use AI suggestions.");
      return;
    }

    const selectedNode = nodes.find(
      (node) => node.id === newEvidence.selectedNodeId
    );
    const selectedDoc = supportingDocuments.find(
      (doc) => doc.id === newEvidence.supportingDocId
    );

    if (!selectedNode || !selectedDoc) {
      alert("Selected node or document not found.");
      return;
    }

    setSuggestLoading(true);
    setSuggestError(null);

    try {
      const response = await fetch("/api/ai/suggest-evidence-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_url: selectedDoc.url,
          node_type: selectedNode.data.type || "unknown",
          node_content: selectedNode.data.text || "",
          node_description: "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to get AI suggestions");
      }

      const data = await response.json();

      // Add the suggested text to the excerpt
      setNewEvidence((ev) => ({
        ...ev,
        excerpt: ev.excerpt
          ? ev.excerpt + "\n\n" + data.suggested_text
          : data.suggested_text,
      }));

      console.log("AI suggestion successful:", data);
    } catch (error: any) {
      console.error("AI suggestion failed:", error);
      setSuggestError(error.message || "Failed to get AI suggestions");
      alert(`AI suggestion failed: ${error.message || "Unknown error"}`);
    } finally {
      setSuggestLoading(false);
    }
  };

  // Handle extract all text functionality
  const handleExtractAllText = async () => {
    const selectedDoc = supportingDocuments.find(
      (doc) => doc.id === newEvidence.supportingDocId
    );

    if (!selectedDoc) {
      alert("Please select a document first.");
      return;
    }

    setExtractLoading(true);
    setExtractError(null);

    try {
      const response = await fetch("/api/ai/extract-all-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_url: selectedDoc.url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to extract text");
      }

      const data = await response.json();

      // Add the extracted text to the excerpt (append, don't overwrite)
      setNewEvidence((ev) => ({
        ...ev,
        excerpt: ev.excerpt
          ? ev.excerpt + "\n\n" + data.extracted_text
          : data.extracted_text,
      }));

      console.log("Text extraction successful:", {
        page_count: data.page_count,
        total_characters: data.total_characters,
      });
    } catch (error: any) {
      console.error("Text extraction failed:", error);
      setExtractError(error.message || "Failed to extract text");
      alert(`Text extraction failed: ${error.message || "Unknown error"}`);
    } finally {
      setExtractLoading(false);
    }
  };

  // Drag start handler for evidence cards
  // Function to clone evidence when it's added to a node
  const cloneEvidence = (originalEvidenceId: string, nodeId: string) => {
    console.log(
      `[cloneEvidence] Cloning evidence ${originalEvidenceId} for node ${nodeId}`
    );
    console.log(
      `[cloneEvidence] Current evidenceCards count:`,
      evidenceCards.length
    );

    const originalEvidence = evidenceCards.find(
      (card) => card.id === originalEvidenceId
    );

    if (!originalEvidence) {
      console.log(
        `[cloneEvidence] Original evidence not found: ${originalEvidenceId}`
      );
      return originalEvidenceId; // Fallback to original if not found
    }

    // Create a new ID that combines original evidence ID and node ID
    const newEvidenceId = `${originalEvidenceId}_${nodeId}`;
    console.log(`[cloneEvidence] New evidence ID: ${newEvidenceId}`);

    // Create the cloned evidence card
    const clonedEvidence = {
      ...originalEvidence,
      id: newEvidenceId,
      confidence: originalEvidence.confidence, // Start with same confidence
    };

    console.log(`[cloneEvidence] Cloned evidence:`, clonedEvidence);

    // Add the cloned evidence to evidenceCards
    setEvidenceCards((prev) => {
      console.log(
        `[cloneEvidence] Adding to evidenceCards. Previous count: ${prev.length}`
      );
      const newArray = [...prev, clonedEvidence];
      console.log(
        `[cloneEvidence] New evidenceCards count: ${newArray.length}`
      );
      return newArray;
    });

    return newEvidenceId;
  };

  const handleEvidenceDragStart = (event: React.DragEvent, cardId: string) => {
    event.dataTransfer.setData("application/x-evidence-id", cardId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    console.log(`[handleDeleteEvidence] Deleting evidence: ${evidenceId}`);

    // Remove the evidence from evidenceCards
    setEvidenceCards((prev) => prev.filter((card) => card.id !== evidenceId));

    // Remove the evidence ID from all nodes that reference it
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.data.evidenceIds?.includes(evidenceId)) {
          return {
            ...node,
            data: {
              ...node.data,
              evidenceIds: node.data.evidenceIds.filter(
                (id) => id !== evidenceId
              ),
            },
          };
        }
        return node;
      })
    );
  };

  // Handle evidence drop on nodes with cloning logic
  const handleNodeEvidenceDrop = useCallback(
    (nodeId: string, evidenceId: string) => {
      console.log(
        `[handleNodeEvidenceDrop] Called with nodeId: ${nodeId}, evidenceId: ${evidenceId}`
      );

      // Clone the evidence first
      const clonedEvidenceId = cloneEvidence(evidenceId, nodeId);
      console.log(
        `[handleNodeEvidenceDrop] Cloned evidence ID: ${clonedEvidenceId}`
      );

      // Use setNodes to get and update the current node state
      setNodes((currentNodes) => {
        console.log(
          `[handleNodeEvidenceDrop] Available nodes:`,
          currentNodes.map((n) => ({ id: n.id, text: n.data.text }))
        );

        const node = currentNodes.find((n) => n.id === nodeId);
        if (!node) {
          console.log(`[handleNodeEvidenceDrop] Node not found: ${nodeId}`);
          console.log(
            `[handleNodeEvidenceDrop] Available node IDs:`,
            currentNodes.map((n) => n.id)
          );
          return currentNodes; // Return unchanged if node not found
        }

        const prevIds = Array.isArray(node.data.evidenceIds)
          ? node.data.evidenceIds
          : [];
        console.log(`[handleNodeEvidenceDrop] Current evidenceIds:`, prevIds);

        // Check if this original evidence is already attached (check for cloned versions)
        const isAlreadyAttached = prevIds.some((id) =>
          id.startsWith(`${evidenceId}_`)
        );

        if (!isAlreadyAttached) {
          console.log(
            `[handleNodeEvidenceDrop] Evidence not attached yet, updating node...`
          );

          const newEvidenceIds = [...prevIds, clonedEvidenceId];
          console.log(
            `[handleNodeEvidenceDrop] New evidenceIds:`,
            newEvidenceIds
          );

          // Update the specific node
          return currentNodes.map((n) =>
            n.id === nodeId
              ? {
                ...n,
                data: {
                  ...n.data,
                  evidenceIds: newEvidenceIds,
                  // Preserve callbacks
                  onChange: n.data.onChange,
                  onEvidenceDrop: n.data.onEvidenceDrop,
                },
              }
              : n
          );
        } else {
          console.log(
            `[handleNodeEvidenceDrop] Evidence already attached, skipping`
          );
          return currentNodes; // Return unchanged
        }
      });

      // Immediately trigger evidence check and credibility update
      setApiQueue((prev) => [...prev.filter((id) => id !== nodeId), nodeId]);
    },
    [cloneEvidence]
  );

  const handleExport = async () => {
    logAction(
      "export_graph",
      { graphId: currentGraphId || currentGraph?.id },
      profile?.user_id
    );
    // Format the graph data according to the required structure
    const graphData: ExportedGraphData = {
      evidence: evidenceCards || [],
      nodes: nodes.map((node) => ({
        id: node.id,
        text: node.data.text,
        type: node.data.type,
        author: node.data.author,
        belief: clamp(node.data.belief ?? 0.5, 0, 1),
        credibilityScore: node.data.credibilityScore ?? 0,
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

  const handleImport = async () => {
    takeSnapshot();
    logAction("import_graph_start", {}, profile?.user_id);
    // Create a hidden file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";

    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        // Clean up if no file selected
        document.body.removeChild(fileInput);
        return;
      }

      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setToast("File too large. Please select a file smaller than 10MB.");
        setTimeout(() => setToast(null), 5000);
        document.body.removeChild(fileInput);
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        console.log("Imported data:", data);

        // Validate the JSON structure
        const validationResult = validateGraphData(data);
        if (!validationResult.isValid) {
          setToast(`Invalid file format: ${validationResult.error}`);
          setTimeout(() => setToast(null), 5000);
          return;
        }

        // Import the validated data
        importGraphData(data);

        // Show success message with statistics
        const stats = {
          evidence: data.evidence?.length || 0,
          nodes: data.nodes?.length || 0,
          edges: data.edges?.length || 0,
        };
        setToast(
          `Graph imported successfully! (${stats.nodes} nodes, ${stats.edges} edges, ${stats.evidence} evidence)`
        );
        setTimeout(() => setToast(null), 4000);
      } catch (error) {
        console.error("Error reading file:", error);
        if (error instanceof SyntaxError) {
          setToast("Invalid JSON format. Please check your file.");
        } else {
          setToast("Error reading file. Please try again.");
        }
        setTimeout(() => setToast(null), 5000);
      } finally {
        // Clean up
        document.body.removeChild(fileInput);
      }
    };

    // Handle file dialog cancellation
    fileInput.oncancel = () => {
      document.body.removeChild(fileInput);
    };

    // Trigger file dialog
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  // Add validation function with detailed error messages
  const validateGraphData = (
    data: any
  ): { isValid: boolean; error?: string } => {
    // Check if data has the required structure
    if (!data || typeof data !== "object") {
      return { isValid: false, error: "Data is not a valid object" };
    }

    // Check for required arrays
    if (!Array.isArray(data.evidence)) {
      return { isValid: false, error: "Missing or invalid evidence array" };
    }
    if (!Array.isArray(data.nodes)) {
      return { isValid: false, error: "Missing or invalid nodes array" };
    }
    if (!Array.isArray(data.edges)) {
      return { isValid: false, error: "Missing or invalid edges array" };
    }

    // Check for reasonable array sizes (prevent extremely large files)
    if (data.evidence.length > 1000) {
      return { isValid: false, error: "Too many evidence items (max 1000)" };
    }
    if (data.nodes.length > 500) {
      return { isValid: false, error: "Too many nodes (max 500)" };
    }
    if (data.edges.length > 1000) {
      return { isValid: false, error: "Too many edges (max 1000)" };
    }

    // Validate evidence structure (checking only required fields, allowing extra fields)
    for (let i = 0; i < data.evidence.length; i++) {
      const evidence = data.evidence[i];
      if (
        !evidence.id ||
        !evidence.title ||
        !evidence.excerpt ||
        !evidence.supportingDocId ||
        !evidence.supportingDocName
      ) {
        return {
          isValid: false,
          error: `Evidence item ${i} is missing required fields (id, title, excerpt, supportingDocId, supportingDocName)`,
        };
      }
      if (
        typeof evidence.confidence !== "number" ||
        evidence.confidence < -1 ||
        evidence.confidence > 1
      ) {
        return {
          isValid: false,
          error: `Evidence item ${i} has invalid confidence value (must be a number between -1 and 1)`,
        };
      }
    }

    // Validate nodes structure
    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i];
      if (!node.id || !node.text || !node.type) {
        return {
          isValid: false,
          error: `Node ${i} is missing required fields (id, text, type)`,
        };
      }
      if (
        typeof node.belief !== "number" ||
        node.belief < 0 ||
        node.belief > 1
      ) {
        return {
          isValid: false,
          error: `Node ${i} has invalid belief value (must be a number between 0 and 1)`,
        };
      }
      if (typeof node.credibilityScore !== "number") {
        return {
          isValid: false,
          error: `Node ${i} has invalid credibilityScore (must be a number)`,
        };
      }
      if (
        !node.position ||
        typeof node.position.x !== "number" ||
        typeof node.position.y !== "number"
      ) {
        return {
          isValid: false,
          error: `Node ${i} has invalid position (must have x and y coordinates)`,
        };
      }
      if (!node.created_on || typeof node.created_on !== "string") {
        return {
          isValid: false,
          error: `Node ${i} has invalid created_on field (must be a string)`,
        };
      }
      if (!Array.isArray(node.evidenceIds)) {
        return {
          isValid: false,
          error: `Node ${i} has invalid evidenceIds (must be an array)`,
        };
      }
    }

    // Validate edges structure
    for (let i = 0; i < data.edges.length; i++) {
      const edge = data.edges[i];
      if (!edge.id || !edge.source || !edge.target) {
        return {
          isValid: false,
          error: `Edge ${i} is missing required fields (id, source, target)`,
        };
      }
      if (
        typeof edge.weight !== "number" ||
        edge.weight < -1 ||
        edge.weight > 1
      ) {
        return {
          isValid: false,
          error: `Edge ${i} has invalid weight value (must be a number between -1 and 1)`,
        };
      }
    }

    return { isValid: true };
  };

  // Import graph data function
  const importGraphData = (data: ExportedGraphData) => {
    try {
      // Clear current graph
      takeSnapshot();
      setNodes([]);
      setEdges([]);
      setEvidenceCards([]);

      // Import evidence
      setEvidenceCards(data.evidence || []);

      // Import nodes
      const importedNodes = (data.nodes || []).map((nodeData) => ({
        id: nodeData.id,
        type: "default" as const,
        position: nodeData.position || { x: 0, y: 0 },
        style: getNodeStyle(nodeData.type),
        data: {
          text: nodeData.text,
          type: nodeData.type,
          author: nodeData.author,
          belief: nodeData.belief || 0.5,
          credibilityScore: nodeData.credibilityScore || 0,
          created_on: nodeData.created_on || new Date().toISOString(),
          evidenceIds: nodeData.evidenceIds || [],
        },
      }));
      setNodes(importedNodes);

      // Create a set of valid node IDs for edge validation
      const validNodeIds = new Set(importedNodes.map((node) => node.id));

      // Import edges (filter out edges with invalid source/target)
      const importedEdges = (data.edges || [])
        .filter((edgeData) => {
          const isValid =
            validNodeIds.has(edgeData.source) &&
            validNodeIds.has(edgeData.target);
          if (!isValid) {
            console.warn(
              `Skipping edge ${edgeData.id}: invalid source or target node`
            );
          }
          return isValid;
        })
        .map((edgeData) => ({
          id: edgeData.id,
          source: edgeData.source,
          target: edgeData.target,
          type: "custom" as const,
          data: {
            confidence: edgeData.weight || 0,
            edgeType: "supporting" as const, // Default to supporting, can be enhanced later
            edgeScore: 0, // Default value
          },
        }));
      setEdges(importedEdges);

      console.log("Graph imported successfully:", {
        evidenceCount: data.evidence?.length || 0,
        nodeCount: data.nodes?.length || 0,
        edgeCount: importedEdges.length,
        skippedEdges: (data.edges?.length || 0) - importedEdges.length,
      });
    } catch (error) {
      console.error("Error during graph import:", error);
      setToast("Error importing graph data. Please try again.");
      setTimeout(() => setToast(null), 5000);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  // State for import
  const [isImporting, setIsImporting] = useState(false);

  // Handler for text area modal
  const handleOpenTextArea = () => {
    setIsTextAreaModalOpen(true);
    setTextAreaContent("");
  };

  const handleCloseTextArea = () => {
    setIsTextAreaModalOpen(false);
    setTextAreaContent("");
  };

  // Handler for processing text through LLM argument mining (Step 1 & 2)
  const handleProcessTextWithLLM = async () => {
    if (!textAreaContent.trim()) {
      setToast("Please enter some text to process.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Close modal and indicate processing
    setIsTextAreaModalOpen(false);
    setToast("Processing text with AI...");

    try {
      console.log("[GraphCanvas] handleProcessTextWithLLM: Starting LLM call");

      const requestBody = {
        model: "gpt-4.1-mini",
        system_prompt:
          'You are an argument mining bot, given an essay, extract the argument graph of the essay. You should return a Python dictionary containing a list of nodes and a list of edges.Where each element in the list of nodes is in the format of{"text": {span of text corresponding to each node extracted from the essay},"id": {the node number} such as 1, 2, 3,...,"type": Choose from {"Factual", "Policy", or "Value"}} You should return the nodes in the order they appear in the essay.Additionally, the list of edges should be in the format of{"label": {the label of the edge}, ONLY choose from support and attack, where support is a positive relationship between the two nodes and attack is a negative relationship between the two nodes,"source": {the node number} such as 1, 2, 3,...,"target": {the node number} such as 1, 2, 3,...,}You should return the final answer in a dictionary format containing a list of edges and a list of nodes. The format is something like {[], []} RETURN THE DICTIONARY and NOTHING ELSE. DONT MAKE ANYTHING UP THAT IS NOT IN THE INPUT STRING.',
        user_input: textAreaContent,
      };

      console.log(
        "[GraphCanvas] handleProcessTextWithLLM: Request body:",
        requestBody
      );

      const response = await fetch("/api/ai/process-argument-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to process text with AI.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        "[GraphCanvas] handleProcessTextWithLLM: Received response:",
        data
      );

      // Automatically import the converted graph if successful
      if (data.success && data.converted_graph) {
        importGraphData(data.converted_graph);
        setToast("Graph imported successfully!");
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast("Error: Could not parse LLM output");
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err: any) {
      console.error("[GraphCanvas] handleProcessTextWithLLM: Error:", err);
      setToast(`Error processing text: ${err.message}`);
      setTimeout(() => setToast(null), 5000);
    }
  };

  // State for report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState("");
  const [showProgressToast, setShowProgressToast] = useState(false);

  const handleGenerateReport = async () => {
    takeSnapshot();
    logAction(
      "generate_report",
      { graphId: currentGraphId || currentGraph?.id },
      profile?.user_id
    );
    console.log(
      "[GraphCanvas] handleGenerateReport: Starting comprehensive report generation"
    );
    setIsGeneratingReport(true);
    setReportProgress("Initializing report generation...");
    setShowProgressToast(true);

    try {
      // Step 1: Check all evidence
      console.log(
        "[GraphCanvas] handleGenerateReport: Step 1 - Checking all evidence"
      );
      setReportProgress("Step 1/5: Evaluating evidence quality...");
      const evidenceResults = await handleCheckEvidence();
      console.log(
        "[GraphCanvas] handleGenerateReport: Evidence evaluation completed"
      );

      // Step 2: Validate all edges
      console.log(
        "[GraphCanvas] handleGenerateReport: Step 2 - Validating all edges"
      );
      setReportProgress("Step 2/5: Validating argument relationships...");
      const edgeResults = await validate_edges();
      console.log(
        "[GraphCanvas] handleGenerateReport: Edge validation completed"
      );

      // Step 3: Generate all assumptions
      console.log(
        "[GraphCanvas] handleGenerateReport: Step 3 - Generating all assumptions"
      );
      setReportProgress("Step 3/5: Identifying implicit assumptions...");
      const assumptionResults = await handleGenerateAllAssumptions();
      console.log(
        "[GraphCanvas] handleGenerateReport: Assumptions generation completed"
      );

      // Step 4: Critique graph
      console.log(
        "[GraphCanvas] handleGenerateReport: Step 4 - Critiquing graph"
      );
      setReportProgress("Step 4/5: Analyzing argument structure...");
      const critiqueResults = await handleCritiqueGraph();
      console.log(
        "[GraphCanvas] handleGenerateReport: Graph critique completed"
      );

      // Step 5: Generate comprehensive report
      console.log(
        "[GraphCanvas] handleGenerateReport: Step 5 - Generating comprehensive report"
      );
      setReportProgress("Step 5/5: Creating final report...");

      // Prepare data for comprehensive report
      const reportData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          evidenceIds: node.data.evidenceIds || [],
        })),
        edges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          weight: edge.data?.confidence || 1.0,
        })),
        evidence: evidenceCards,
        supportingDocuments: supportingDocuments,
        evidence_evaluation_results: evidenceResults,
        edge_validation_results: edgeResults,
        assumptions_results: assumptionResults,
        critique_results: critiqueResults,
        graph_title: title || "Argument Analysis",
        analyst_name:
          `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
          "IntelliProof AI",
        analyst_contact: profile?.email || "ai@intelliproof.com",
      };

      console.log(
        "[GraphCanvas] handleGenerateReport: Sending comprehensive report request"
      );
      const response = await fetch("/api/ai/generate-comprehensive-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reportContent = await response.json();
      console.log(
        "[GraphCanvas] handleGenerateReport: Received comprehensive report"
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Report content keys:",
        Object.keys(reportContent)
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Executive summary length:",
        reportContent.executive_summary?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Findings length:",
        reportContent.findings?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Analysis length:",
        reportContent.analysis?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Cover page length:",
        reportContent.cover_page?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Scope objectives length:",
        reportContent.scope_objectives?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Methodology length:",
        reportContent.methodology?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Conclusion length:",
        reportContent.conclusion?.length || 0
      );
      console.log(
        "[GraphCanvas] handleGenerateReport: Appendix length:",
        reportContent.appendix?.length || 0
      );

      // Generate PDF from report content
      setReportProgress("Generating PDF...");
      const pdf = new jsPDF();

      // Helper function to add content with continuous flow
      const addContentSection = (
        title: string,
        content: string,
        startY: number = 50
      ) => {
        // Add section title
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, 20, startY);
        pdf.setFont("helvetica", "normal");

        // Add more spacing after title for better separation
        let currentY = startY + 20;

        // Ensure content is a string and has meaningful content
        const safeContent =
          content && typeof content === "string" && content.trim().length > 0
            ? content
            : `No ${title.toLowerCase()} content available. This section would typically contain detailed analysis and findings.`;

        const lines = pdf.splitTextToSize(safeContent, 170);

        for (let i = 0; i < lines.length; i++) {
          if (currentY > 270) {
            // Check if we need a new page
            pdf.addPage();
            currentY = 30; // Start closer to top on new page
          }
          pdf.text(lines[i], 20, currentY);
          currentY += 7; // Line spacing
        }

        // Add more spacing after section for better separation
        currentY += 25;

        return currentY; // Return the final Y position for next section
      };

      // Add cover page
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("IntelliProof", 20, 40);
      pdf.setFontSize(24);
      pdf.text("Argument Analysis Report", 20, 60);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(14);

      // Add a line separator
      pdf.line(20, 80, 190, 80);

      pdf.text(
        `Case: ${reportContent.report_metadata?.title || "Argument Analysis"}`,
        20,
        100
      );
      pdf.setFontSize(12);
      pdf.text(
        `Date: ${reportContent.report_metadata?.date || new Date().toLocaleDateString()
        }`,
        20,
        120
      );
      pdf.text(
        `Analyst: ${reportContent.report_metadata?.analyst || "IntelliProof AI"
        }`,
        20,
        135
      );
      pdf.text(
        `Contact: ${reportContent.report_metadata?.contact || "ai@intelliproof.com"
        }`,
        20,
        150
      );

      // Add cover page description if available
      if (reportContent.cover_page) {
        pdf.setFontSize(10);
        const coverLines = pdf.splitTextToSize(reportContent.cover_page, 170);
        pdf.text(coverLines, 20, 170);
      }

      // Start content flow on page 2
      pdf.addPage();

      // Add table of contents
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Table of Contents", 20, 30);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      let tocY = 50;
      const sections = [
        "Executive Summary",
        "Scope & Objectives",
        "Methodology",
        "Findings",
        "Analysis",
        "Conclusion",
        "Appendix",
      ];

      sections.forEach((section, index) => {
        pdf.text(`${index + 1}. ${section}`, 20, tocY);
        tocY += 15;
      });

      // Add a page break after table of contents to ensure clean separation
      pdf.addPage();

      // Add sections continuously, flowing from one to the next
      let currentY = 30; // Start position for first section on new page

      currentY = addContentSection(
        "Executive Summary",
        reportContent.executive_summary || "No executive summary available.",
        currentY
      );

      // Check if we need a new page before starting next section
      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Scope & Objectives",
        reportContent.scope_objectives || "No scope and objectives available.",
        currentY
      );

      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Methodology",
        reportContent.methodology || "No methodology available.",
        currentY
      );

      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Findings",
        reportContent.findings || "No findings available.",
        currentY
      );

      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Analysis",
        reportContent.analysis || "No analysis available.",
        currentY
      );

      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Conclusion",
        reportContent.conclusion || "No conclusion available.",
        currentY
      );

      if (currentY > 250) {
        pdf.addPage();
        currentY = 30;
      }

      currentY = addContentSection(
        "Appendix",
        reportContent.appendix || "No appendix available.",
        currentY
      );

      // Save the PDF
      const fileName = `${title || "argument-analysis"
        }-comprehensive-report.pdf`;
      pdf.save(fileName);

      console.log(
        "[GraphCanvas] handleGenerateReport: Report generation completed successfully"
      );
      setReportProgress("Report generated successfully!");

      // Show success message
      alert(`Comprehensive report generated successfully: ${fileName}`);
    } catch (error) {
      console.error("[GraphCanvas] handleGenerateReport: Error:", error);
      alert("Failed to generate comprehensive report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
      setReportProgress("");
      setShowProgressToast(false);
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
  const [activeTab, setActiveTab] = useState<"chat" | "console">("console");

  // Add state for chat input
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  // Handler for chat input changes
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
  };

  // Handler for chat form submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Add user message
    const userMessage = { role: "user" as const, content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);

    // Clear input
    setChatInput("");

    // Show loading state
    setCopilotLoading(true);

    try {
      // Prepare graph data
      const graphData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          evidenceIds: node.data.evidenceIds || [],
        })),
        edges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          weight: edge.data.confidence || 0,
        })),
        evidence: evidenceCards,
        supportingDocuments: supportingDocuments,
      };

      // Call AI chat API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: userMessage.content,
          chat_history: chatMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          graph_data: graphData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      // Add AI response
      const aiResponse = {
        role: "assistant" as const,
        content: data.assistant_message,
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Chat error:", error);
      // Add error message
      const errorResponse = {
        role: "assistant" as const,
        content: "Sorry, I encountered an error. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorResponse]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handler for chat clear
  const handleClearChat = () => {
    setChatMessages([]);
  };

  // Handler for Claim icon click
  const handleClaimCredibility = async () => {
    takeSnapshot();
    logAction(
      "claim_credibility",
      { graphId: currentGraphId || currentGraph?.id },
      profile?.user_id
    );
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
        evidence:
          Array.isArray(node.data.evidenceIds) &&
            node.data.evidenceIds.length > 0
            ? node.data.evidenceIds.map((evId) => {
              // Find the evidence card and use its confidence, or 0 if not found
              const evidenceCard = evidenceCards.find(
                (card) => card.id === evId
              );
              return evidenceCard ? evidenceCard.confidence : 0;
            })
            : [], // Empty array for no evidence instead of [0.5]
        evidence_min: -1.0,
        evidence_max: 1.0,
      }));

      // Construct edges array from all edges in the graph
      const requestEdges = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data.confidence || 0,
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
      console.log("API Response:", data);
      console.log("Final scores from API:", data.final_scores);

      // Update nodes with credibility scores
      setNodes((nds) =>
        nds.map((node) => {
          const newScore = data.final_scores[node.id];
          console.log(`Node ${node.id} update:`, {
            currentScore: node.data.credibilityScore,
            newScore: newScore,
            scoreFromAPI: data.final_scores[node.id],
            nodeId: node.id,
            allScores: data.final_scores,
            hasScore: node.id in data.final_scores,
          });
          return {
            ...node,
            data: {
              ...node.data,
              credibilityScore:
                newScore !== undefined ? newScore : node.data.credibilityScore,
            },
          };
        })
      );

      // Map node IDs to their text for display
      const nodeIdToText = Object.fromEntries(
        nodes.map((node) => [node.id, node.data.text])
      );

      const credibilityMessages = Object.entries(data.final_scores).map(
        ([id, score]) => ({
          role: "ai",
          content: {
            "Claim Node ID": id,
            "Node Title": nodeIdToText[id] ? nodeIdToText[id] : id,
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

  // NEW: Selective credibility calculation for specific node and its dependents
  const handleNodeCredibility = async (nodeId: string) => {
    takeSnapshot();
    logAction("node_credibility", { nodeId }, profile?.user_id);
    console.log(
      `[GraphCanvas] handleNodeCredibility: Starting for node ${nodeId}`
    );

    // Don't run if there are no nodes
    if (nodes.length === 0) return;

    try {
      setCopilotLoading(true);
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "user",
          content: `Computing credibility scores for node ${nodeId} and affected nodes...`,
        },
      ]);

      // Gather evidence scores for all nodes (needed for the API)
      const requestNodes = nodes.map((node) => ({
        id: node.id,
        text: node.data.text,
        type: node.data.type,
        evidence:
          Array.isArray(node.data.evidenceIds) &&
            node.data.evidenceIds.length > 0
            ? node.data.evidenceIds.map((evId) => {
              const evidenceCard = evidenceCards.find(
                (card) => card.id === evId
              );
              return evidenceCard ? evidenceCard.confidence : 0;
            })
            : [],
        evidence_min: -1.0,
        evidence_max: 1.0,
      }));

      // Construct edges array from all edges in the graph
      const requestEdges = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data.confidence || 0,
      }));

      const requestBody = {
        target_node_id: nodeId,
        nodes: requestNodes,
        edges: requestEdges,
        lambda: 0.7,
        epsilon: 0.01,
        max_iterations: 20,
        evidence_min: -1.0,
        evidence_max: 1.0,
      };

      console.log(
        `[GraphCanvas] handleNodeCredibility: Sending request for node ${nodeId}:`,
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch("/api/ai/get-node-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to fetch node credibility.";
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
          errorMsg = "Failed to fetch node credibility.";
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[GraphCanvas] handleNodeCredibility: API Response for node ${nodeId}:`,
        data
      );
      console.log(
        `[GraphCanvas] handleNodeCredibility: Affected nodes:`,
        data.affected_nodes
      );
      console.log(
        `[GraphCanvas] handleNodeCredibility: Final scores:`,
        data.final_scores
      );

      // Update only the affected nodes with credibility scores
      setNodes((nds) =>
        nds.map((node) => {
          const newScore = data.final_scores[node.id];
          if (newScore !== undefined) {
            console.log(
              `[GraphCanvas] handleNodeCredibility: Updating node ${node.id} credibility from ${node.data.credibilityScore} to ${newScore}`
            );
            return {
              ...node,
              data: {
                ...node.data,
                credibilityScore: newScore,
              },
            };
          }
          return node; // Keep unchanged if not affected
        })
      );

      // Display results in copilot for affected nodes only
      const nodeIdToText = Object.fromEntries(
        nodes.map((node) => [node.id, node.data.text])
      );

      const credibilityMessages = Object.entries(data.final_scores).map(
        ([id, score]) => ({
          role: "ai",
          content: {
            "Affected Node ID": id,
            "Node Title": nodeIdToText[id] ? nodeIdToText[id] : id,
            "Final Credibility Score": (score as number).toFixed(5),
          },
          isStructured: true,
        })
      );

      setCopilotMessages((msgs) => [...msgs, ...credibilityMessages]);

      console.log(
        `[GraphCanvas] handleNodeCredibility: Completed successfully for node ${nodeId}`
      );
    } catch (error) {
      console.error(
        `[GraphCanvas] handleNodeCredibility: Error for node ${nodeId}:`,
        error
      );
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `<span style="color: red;">Error computing credibility for node ${nodeId}: ${error instanceof Error ? error.message : "Unknown error"
            }</span>`,
        },
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
              "Node Title": claimText,
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

    // Find which node this evidence belongs to and mark it as modified
    const nodeWithEvidence = nodes.find((node) =>
      node.data.evidenceIds?.includes(evidenceId)
    );
    if (nodeWithEvidence) {
      setModifiedNodes(
        (prev) => new Set(Array.from(prev).concat(nodeWithEvidence.id))
      );
    }

    updateCredibilityScores();
  };

  const handleUnlinkEvidence = (evidenceId: string, nodeId: string) => {
    console.log(
      `[handleUnlinkEvidence] Unlinking evidence ${evidenceId} from node ${nodeId}`
    );

    // Remove the evidence ID from the node's evidenceIds array
    setNodes((prevNodes) => {
      const updatedNodes = prevNodes.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              evidenceIds:
                node.data.evidenceIds?.filter((id) => id !== evidenceId) || [],
              // Preserve callbacks
              onChange: node.data.onChange,
              onEvidenceDrop: node.data.onEvidenceDrop,
            },
          };
          return updatedNode;
        }
        return node;
      });

      // Update selectedNode if this is the currently selected node
      if (selectedNode?.id === nodeId) {
        const updatedSelectedNode = updatedNodes.find((n) => n.id === nodeId);
        if (updatedSelectedNode) {
          setSelectedNode(updatedSelectedNode);
          console.log(
            `[handleUnlinkEvidence] Updated selectedNode for immediate modal refresh`
          );
        }
      }

      return updatedNodes;
    });

    // Immediately trigger evidence check and credibility update
    setApiQueue((prev) => [...prev.filter((id) => id !== nodeId), nodeId]);
  };

  const pdfPreviewerRef = useRef<PDFPreviewerHandle>(null);

  // Place these at the top level of GraphCanvasInner (with other hooks):
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Add state for API queue and processing
  const [apiQueue, setApiQueue] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add state to track node modifications
  const [modifiedNodes, setModifiedNodes] = useState<Set<string>>(new Set());
  const prevSelectedNodeRef = useRef<ClaimNode | null>(null);

  // Detect node deselect and queue API call only if node was modified
  useEffect(() => {
    if (prevSelectedNodeRef.current?.id && !selectedNode) {
      const prevId = prevSelectedNodeRef.current.id;

      // Only trigger API calls if the node was actually modified
      if (modifiedNodes.has(prevId)) {
        console.log(`Node ${prevId} was modified, triggering API calls`);

        // First run check_evidence to update evidence confidences
        setApiQueue((q) => [...q, prevId]);

        // Queue all connected edges for validation
        const connectedEdges = getConnectedEdges(prevId);
        if (connectedEdges.length > 0) {
          console.log(
            `Node ${prevId} has ${connectedEdges.length} connected edges, queuing for validation`
          );
          setEdgeApiQueue((q) => [...q, ...connectedEdges.map((e) => e.id)]);
        }

        // Remove the node from modified set after triggering API calls
        setModifiedNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(prevId);
          return newSet;
        });
      } else {
        console.log(`Node ${prevId} was not modified, skipping API calls`);
      }
    }
    prevSelectedNodeRef.current = selectedNode || null;
  }, [selectedNode, modifiedNodes]);

  // Queue processor effect - modified to run credibility after evidence check
  useEffect(() => {
    if (!isProcessing && apiQueue.length > 0) {
      setIsProcessing(true);
      const nodeId = apiQueue[0];
      console.log(`[GraphCanvas] Queue processor: Processing node ${nodeId}`);

      triggerCheckNodeEvidence(nodeId)
        .then(async (updatedEvidenceData) => {
          console.log(
            `[GraphCanvas] Queue processor: Evidence check completed for node ${nodeId}`
          );
          console.log(
            `[GraphCanvas] Queue processor: Updated evidence data:`,
            updatedEvidenceData
          );

          setApiQueue((q) => q.slice(1));
          setIsProcessing(false);

          // After evidence check completes, run selective credibility for the specific node
          console.log(
            `[GraphCanvas] Queue processor: Running selective credibility for node ${nodeId}`
          );
          try {
            // await handleNodeCredibility(nodeId);
            await handleClaimCredibilityWithUpdatedEvidence(
              updatedEvidenceData,
              nodeId
            );
            console.log(
              `[GraphCanvas] Queue processor: Selective credibility computation completed for node ${nodeId}`
            );
          } catch (error) {
            console.error(
              `[GraphCanvas] Queue processor: Error in selective credibility computation:`,
              error
            );
            setCopilotMessages((msgs) => [
              ...msgs,
              {
                role: "ai",
                content: `Error computing credibility scores for node ${nodeId}: ${error instanceof Error ? error.message : "Unknown error"
                  }`,
              },
            ]);
          }
        })
        .catch((error) => {
          console.error(
            `[GraphCanvas] Queue processor: Error in evidence check:`,
            error
          );
          setApiQueue((q) => q.slice(1));
          setIsProcessing(false);
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "ai",
              content: `Error checking evidence: ${error instanceof Error ? error.message : "Unknown error"
                }`,
            },
          ]);
        });
    }
  }, [apiQueue, isProcessing]);

  // API call function for queued node evidence check
  const triggerCheckNodeEvidence = async (nodeId: string) => {
    console.log(
      `[GraphCanvas] triggerCheckNodeEvidence: Starting evidence check for node ${nodeId}`
    );
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Node ${nodeId} not found`
      );
      return null;
    }

    try {
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

      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Request body:`,
        requestBody
      );

      const response = await fetch("/api/ai/check-node-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Response status: ${response.status}`
      );

      if (!response.ok) {
        let errorMsg = "Failed to check evidence for node.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        console.error(
          `[GraphCanvas] triggerCheckNodeEvidence: API error: ${errorMsg}`
        );
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: API response data:`,
        data
      );

      // Output each result as a structured message (same as check_evidence)
      data.results.forEach((result: any) => {
        const claimNode = node;
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
              "Node Title": claimText,
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
            console.log(
              `[GraphCanvas] triggerCheckNodeEvidence: Updating evidence ${ev.id} confidence from ${ev.confidence} to ${found.confidence}`
            );
            return {
              ...ev,
              confidence: found.confidence,
              evaluation: found.evaluation,
              reasoning: found.reasoning,
            };
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
        .filter((c) => typeof c === "number");

      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Updated confidences for node ${nodeId}:`,
        updatedConfidences
      );

      const avgConfidence =
        updatedConfidences.length > 0
          ? updatedConfidences.reduce((a, b) => a + b, 0) /
          updatedConfidences.length
          : 0;

      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Average confidence for node ${nodeId}: ${avgConfidence}`
      );

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

      // Return the updated evidence data for credibility calculation
      console.log(
        `[GraphCanvas] triggerCheckNodeEvidence: Returning ${data.results.length} evidence results for credibility computation`
      );
      return data.results;
    } catch (err: any) {
      console.error(
        `[GraphCanvas] triggerCheckNodeEvidence: Error checking evidence for node ${nodeId}:`,
        err
      );
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `Error checking evidence for node ${nodeId}: ${err.message}`,
        },
      ]);
      return null;
    }
  };

  // New function to run credibility with updated evidence data
  const handleClaimCredibilityWithUpdatedEvidence = async (
    updatedEvidenceData: any[],
    nodeId: string
  ) => {
    takeSnapshot();
    logAction(
      "claim_credibility_updated_evidence",
      { nodeId },
      profile?.user_id
    );
    console.log(
      `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Starting with ${updatedEvidenceData.length} evidence items`
    );
    console.log(
      `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Updated evidence data:`,
      updatedEvidenceData
    );

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
      // Create a map of updated evidence confidences
      const updatedEvidenceMap = new Map();
      updatedEvidenceData.forEach((result: any) => {
        updatedEvidenceMap.set(result.evidence_id, result.confidence);
      });
      console.log(
        `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Created evidence map with ${updatedEvidenceMap.size} entries`
      );
      console.log(
        `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Evidence map:`,
        Object.fromEntries(updatedEvidenceMap)
      );

      // Gather evidence scores for all nodes using updated confidences
      const requestNodes = nodes.map((node) => {
        let nodeEvidence;
        if (node.id === nodeId) {
          // Use updated confidences for this specific node
          nodeEvidence =
            Array.isArray(node.data.evidenceIds) &&
              node.data.evidenceIds.length > 0
              ? node.data.evidenceIds.map((evId) => {
                const updatedConfidence = updatedEvidenceMap.get(evId);
                if (updatedConfidence !== undefined) {
                  console.log(
                    `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Using updated confidence ${updatedConfidence} for evidence ${evId}`
                  );
                  return updatedConfidence;
                }
                const evidenceCard = evidenceCards.find(
                  (card) => card.id === evId
                );
                const fallbackConfidence = evidenceCard
                  ? evidenceCard.confidence
                  : 0;
                console.log(
                  `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Using fallback confidence ${fallbackConfidence} for evidence ${evId}`
                );
                return fallbackConfidence;
              })
              : [];
        } else {
          // Use state for other nodes
          nodeEvidence =
            Array.isArray(node.data.evidenceIds) &&
              node.data.evidenceIds.length > 0
              ? node.data.evidenceIds.map((evId) => {
                const evidenceCard = evidenceCards.find(
                  (card) => card.id === evId
                );
                return evidenceCard ? evidenceCard.confidence : 0;
              })
              : [];
        }

        console.log(
          `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Node ${node.id} evidence scores:`,
          nodeEvidence
        );

        return {
          id: node.id,
          evidence: nodeEvidence,
          evidence_min: -1.0,
          evidence_max: 1.0,
        };
      });

      // Construct edges array from all edges in the graph
      const requestEdges = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data.confidence || 0,
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
        "[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Sending request body with updated evidence:",
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch("/api/ai/get-claim-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(
        `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Response status: ${response.status}`
      );

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
        console.error(
          `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: API error: ${errorMsg}`
        );
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        "[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: API Response:",
        data
      );
      console.log(
        "[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Final scores from API:",
        data.final_scores
      );

      // Update nodes with credibility scores
      setNodes((nds) =>
        nds.map((node) => {
          const newScore = data.final_scores[node.id];
          console.log(
            `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Node ${node.id} update:`,
            {
              currentScore: node.data.credibilityScore,
              newScore: newScore,
              scoreFromAPI: data.final_scores[node.id],
              nodeId: node.id,
              allScores: data.final_scores,
              hasScore: node.id in data.final_scores,
            }
          );
          return {
            ...node,
            data: {
              ...node.data,
              credibilityScore: newScore || 0,
            },
          };
        })
      );

      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `Credibility scores updated using AI-evaluated evidence confidence scores.`,
          isStructured: true,
        },
      ]);

      console.log(
        `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Successfully completed credibility computation`
      );
    } catch (err: any) {
      console.error(
        `[GraphCanvas] handleClaimCredibilityWithUpdatedEvidence: Error:`,
        err
      );
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `Error computing credibility: ${err.message}`,
        },
      ]);
      throw err; // Re-throw to be caught by the queue processor
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleValidateEdge = async () => {
    takeSnapshot();
    logAction("validate_edge", { edgeId: selectedEdge?.id }, profile?.user_id);
    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content: "Validate the selected edge for support/attack and reasoning.",
      },
    ]);
    try {
      if (!selectedEdge) {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "assistant",
            content:
              "<span class='text-red-600'>Error: Please select an edge to validate.</span>",
          },
        ]);
        return;
      }
      // Find source and target nodes
      const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
      const targetNode = nodes.find((n) => n.id === selectedEdge.target);
      if (!sourceNode || !targetNode) {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "assistant",
            content:
              "<span class='text-red-600'>Error: Could not find source or target node for the selected edge.</span>",
          },
        ]);
        return;
      }
      // Prepare request body (with evidence as floats)
      const getNodeEvidence = (node: ClaimNode) => {
        if (!node.data || !Array.isArray(node.data.evidenceIds)) return [];
        return evidenceCards
          .filter((ev) => node.data.evidenceIds!.includes(ev.id))
          .map((ev) => ev.confidence);
      };
      const requestBody = {
        edge: {
          source: selectedEdge.source,
          target: selectedEdge.target,
        },
        source_node: {
          id: sourceNode.id,
          text: sourceNode.data.text,
          type: sourceNode.data.type,
          evidence: getNodeEvidence(sourceNode),
        },
        target_node: {
          id: targetNode.id,
          text: targetNode.data.text,
          type: targetNode.data.type,
          evidence: getNodeEvidence(targetNode),
        },
      };

      const response = await fetch("/api/ai/validate-edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to validate edge.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("Edge validation response:", data); // Debug log

      // Update the edge with confidence, edgeScore, and reasoning
      handleEdgeUpdate(selectedEdge.id, {
        data: {
          ...selectedEdge.data,
          confidence: data.confidence,
          edgeScore: data.confidence, // Set edgeScore from validation result
          reasoning: data.reasoning,
          recommendedEdgeType: (() => {
            const ev = (data.evaluation || "").toString().toLowerCase();
            if (ev.includes("attack")) return "attacking" as const;
            if (ev.includes("support")) return "supporting" as const;
            return undefined;
          })(),
        },
      });

      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: {
            "Edge Source": sourceNode.data.text,
            "Edge Target": targetNode.data.text,
            Evaluation: data.evaluation,
            Reasoning: data.reasoning,
            Confidence: `${Math.round(data.confidence * 100)}%`,
          },
          isStructured: true,
        },
      ]);
    } catch (err: any) {
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: "system", content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Validate all edges with AI and output to copilot
  const validate_edges = async () => {
    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content:
          "Validate all edges in the graph for support/attack/neutral and reasoning.",
      },
    ]);
    try {
      for (const edge of edges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) {
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "assistant",
              content: `<span class='text-red-600'>Error: Could not find source or target node for edge ${edge.id}.</span>`,
            },
          ]);
          continue;
        }
        const getNodeEvidence = (node: ClaimNode) => {
          if (!node.data || !Array.isArray(node.data.evidenceIds)) return [];
          return evidenceCards
            .filter((ev) => node.data.evidenceIds!.includes(ev.id))
            .map((ev) => ev.confidence);
        };
        const requestBody = {
          edge: {
            source: edge.source,
            target: edge.target,
          },
          source_node: {
            id: sourceNode.id,
            text: sourceNode.data.text,
            type: sourceNode.data.type,
            evidence: getNodeEvidence(sourceNode),
          },
          target_node: {
            id: targetNode.id,
            text: targetNode.data.text,
            type: targetNode.data.type,
            evidence: getNodeEvidence(targetNode),
          },
        };
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "system",
            content: `Validating edge from "${sourceNode.data.text}" to "${targetNode.data.text}"...`,
          },
        ]);
        try {
          const response = await fetch("/api/ai/validate-edge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          if (!response.ok) {
            let errorMsg = `Failed to validate edge ${edge.id}.`;
            try {
              const errorData = await response.json();
              if (errorData.detail) errorMsg = errorData.detail;
            } catch { }
            throw new Error(errorMsg);
          }
          const data = await response.json();
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "ai",
              content: {
                "Edge Source": sourceNode.data.text,
                "Edge Target": targetNode.data.text,
                Evaluation: data.evaluation,
                Reasoning: data.reasoning,
                Confidence: `${Math.round(data.confidence * 100)}%`,
              },
              isStructured: true,
            },
          ]);
          // Optionally update the edge confidence in the UI
          handleEdgeUpdate(edge.id, {
            data: {
              ...edge.data,
              confidence: data.confidence,
              edgeScore: data.confidence,
              reasoning: data.reasoning,
            },
          });
        } catch (err) {
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "assistant",
              content: `<span class='text-red-600'>Error: ${err instanceof Error ? err.message : err
                }</span>`,
            },
          ]);
        }
      }
    } finally {
      setCopilotLoading(false);
    }
  };

  // --- Edge validation queue logic ---
  const [edgeApiQueue, setEdgeApiQueue] = useState<string[]>([]);
  const [isEdgeProcessing, setIsEdgeProcessing] = useState(false);

  // Helper function to find all edges connected to a node
  const getConnectedEdges = (nodeId: string) => {
    return edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
  };

  // Queue processor effect for edge validation
  useEffect(() => {
    if (!isEdgeProcessing && edgeApiQueue.length > 0) {
      setIsEdgeProcessing(true);
      const edgeId = edgeApiQueue[0];
      triggerValidateEdge(edgeId).finally(() => {
        setEdgeApiQueue((q) => q.slice(1));
        setIsEdgeProcessing(false);
      });
    }
  }, [edgeApiQueue, isEdgeProcessing]);

  // API call function for queued edge validation
  const triggerValidateEdge = async (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;
    const getNodeEvidence = (node: ClaimNode) => {
      if (!node.data || !Array.isArray(node.data.evidenceIds)) return [];
      return evidenceCards
        .filter((ev) => node.data.evidenceIds!.includes(ev.id))
        .map((ev) => ev.confidence);
    };
    const requestBody = {
      edge: {
        source: edge.source,
        target: edge.target,
      },
      source_node: {
        id: sourceNode.id,
        text: sourceNode.data.text,
        type: sourceNode.data.type,
        evidence: getNodeEvidence(sourceNode),
      },
      target_node: {
        id: targetNode.id,
        text: targetNode.data.text,
        type: targetNode.data.type,
        evidence: getNodeEvidence(targetNode),
      },
    };
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "system",
        content: `Validating edge from "${sourceNode.data.text}" to "${targetNode.data.text}"...`,
      },
    ]);
    try {
      const response = await fetch("/api/ai/validate-edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        let errorMsg = `Failed to validate edge ${edge.id}.`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: {
            "Edge Source": sourceNode.data.text,
            "Edge Target": targetNode.data.text,
            Evaluation: data.evaluation,
            Reasoning: data.reasoning,
            Confidence: `${Math.round(data.confidence * 100)}%`,
          },
          isStructured: true,
        },
      ]);
      // Optionally update the edge confidence in the UI
      handleEdgeUpdate(edge.id, {
        data: {
          ...edge.data,
          confidence: data.confidence,
          edgeScore: data.confidence,
          reasoning: data.reasoning,
        },
      });
    } catch (err) {
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: `<span class='text-red-600'>Error: ${err instanceof Error ? err.message : err
            }</span>`,
        },
      ]);
    }
  };

  // Queue edge validation when a new edge is created
  const prevEdgesRef = useRef<ClaimEdge[]>([]);
  useEffect(() => {
    // Skip during initial load
    if (isInitialLoad) {
      if (edges.length > 0) {
        prevEdgesRef.current = edges;
        setIsInitialLoad(false);
      }
      return;
    }

    // Only run after initial mount
    if (edges.length === 0) return;

    // Find edges that are new (not in previous ref)
    const prevEdges = prevEdgesRef.current;
    const newEdges = edges.filter(
      (e) => !prevEdges.some((pe) => pe.id === e.id)
    );
    if (newEdges.length > 0) {
      setEdgeApiQueue((q) => [...q, ...newEdges.map((e) => e.id)]);
    }
    prevEdgesRef.current = edges;
  }, [edges, isInitialLoad]);

  // Add this handler in GraphCanvasInner:
  const handleClearCopilotChat = () => {
    setCopilotMessages([]); // Only clear chat messages, not the CommandMessageBox buttons
  };

  // Handler for Generate Assumptions button click
  const handleGenerateAssumptions = async () => {
    // Check if an edge is selected
    if (!selectedEdge) {
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content:
            "Please select an edge first to generate assumptions. Click on an edge between two nodes to select it.",
        },
      ]);
      return;
    }

    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content: "Generate assumptions for the selected edge relationship.",
      },
    ]);

    try {
      // Find the source and target nodes
      const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
      const targetNode = nodes.find((n) => n.id === selectedEdge.target);

      if (!sourceNode || !targetNode) {
        throw new Error(
          "Source or target node not found for the selected edge."
        );
      }

      // Prepare request body
      const requestBody = {
        edge: {
          source: selectedEdge.source,
          target: selectedEdge.target,
          weight: selectedEdge.data.confidence,
        },
        source_node: {
          id: sourceNode.id,
          text: sourceNode.data.text,
          type: sourceNode.data.type,
          evidenceIds: sourceNode.data.evidenceIds || [],
        },
        target_node: {
          id: targetNode.id,
          text: targetNode.data.text,
          type: targetNode.data.type,
          evidenceIds: targetNode.data.evidenceIds || [],
        },
        evidence: evidenceCards,
        supportingDocuments: supportingDocumentsRedux,
      };

      console.log(
        `[GraphCanvas] handleGenerateAssumptions: Sending request to /api/ai/generate-assumptions`
      );
      console.log(
        `[GraphCanvas] handleGenerateAssumptions: Request body:`,
        requestBody
      );

      const response = await fetch("/api/ai/generate-assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to generate assumptions.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[GraphCanvas] handleGenerateAssumptions: Received response:`,
        data
      );

      // Display the summary first
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: {
            "Edge ID": data.edge_id,
            "Edge Type": data.edge_type,
            "Source Node": data.source_node_text,
            "Target Node": data.target_node_text,
            "Relationship Type": data.relationship_type,
            "Overall Confidence": `${Math.round(
              data.overall_confidence * 100
            )}%`,
            Summary: data.summary,
          },
          isStructured: true,
        },
      ]);

      // Display each assumption as a separate message
      data.assumptions.forEach((assumption: any, index: number) => {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: {
              [`Assumption ${index + 1}`]: assumption.assumption_text,
              Reasoning: assumption.reasoning,
              Importance: `${Math.round(assumption.importance * 100)}%`,
              Confidence: `${Math.round(assumption.confidence * 100)}%`,
            },
            isStructured: true,
          },
        ]);
      });
    } catch (err: any) {
      console.error(`[GraphCanvas] handleGenerateAssumptions: Error:`, err);
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: "ai", content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handler for Generate All Assumptions button click
  const handleGenerateAllAssumptions = async () => {
    // Check if there are any edges in the graph
    if (edges.length === 0) {
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content:
            "No edges found in the graph. Please add some edges between nodes to generate assumptions.",
        },
      ]);
      return;
    }

    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content: `Generate assumptions for all ${edges.length} edges in the graph.`,
      },
    ]);

    try {
      // Process each edge sequentially
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];

        // Find the source and target nodes
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) {
          console.warn(`Source or target node not found for edge ${edge.id}`);
          continue;
        }

        // Add a separator message for each edge
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: `--- Processing Edge ${i + 1}/${edges.length}: ${sourceNode.data.text
              } → ${targetNode.data.text} ---`,
          },
        ]);

        // Prepare request body
        const requestBody = {
          edge: {
            source: edge.source,
            target: edge.target,
            weight: edge.data.confidence,
          },
          source_node: {
            id: sourceNode.id,
            text: sourceNode.data.text,
            type: sourceNode.data.type,
            evidenceIds: sourceNode.data.evidenceIds || [],
          },
          target_node: {
            id: targetNode.id,
            text: targetNode.data.text,
            type: targetNode.data.type,
            evidenceIds: targetNode.data.evidenceIds || [],
          },
          evidence: evidenceCards,
          supportingDocuments: supportingDocumentsRedux,
        };

        console.log(
          `[GraphCanvas] handleGenerateAllAssumptions: Processing edge ${i + 1
          }/${edges.length}`
        );

        const response = await fetch("/api/ai/generate-assumptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorMsg = "Failed to generate assumptions for this edge.";
          try {
            const errorData = await response.json();
            if (errorData.detail) errorMsg = errorData.detail;
          } catch { }

          setCopilotMessages((msgs) => [
            ...msgs,
            { role: "ai", content: `Error for edge ${i + 1}: ${errorMsg}` },
          ]);
          continue;
        }

        const data = await response.json();
        console.log(
          `[GraphCanvas] handleGenerateAllAssumptions: Received response for edge ${i + 1
          }:`,
          data
        );

        // Display the summary for this edge
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: {
              [`Edge ${i + 1} Summary`]: {
                "Edge ID": data.edge_id,
                "Edge Type": data.edge_type,
                "Source Node": data.source_node_text,
                "Target Node": data.target_node_text,
                "Relationship Type": data.relationship_type,
                "Overall Confidence": `${Math.round(
                  data.overall_confidence * 100
                )}%`,
                Summary: data.summary,
              },
            },
            isStructured: true,
          },
        ]);

        // Display each assumption as a separate message
        data.assumptions.forEach((assumption: any, index: number) => {
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "ai",
              content: {
                [`Edge ${i + 1} - Assumption ${index + 1}`]:
                  assumption.assumption_text,
                Reasoning: assumption.reasoning,
                Importance: `${Math.round(assumption.importance * 100)}%`,
                Confidence: `${Math.round(assumption.confidence * 100)}%`,
              },
              isStructured: true,
            },
          ]);
        });
      }

      // Add completion message
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `✅ Completed generating assumptions for all ${edges.length} edges in the graph.`,
        },
      ]);
    } catch (err: any) {
      console.error(`[GraphCanvas] handleGenerateAllAssumptions: Error:`, err);
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: "ai", content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handler for Critique Graph button click
  const handleCritiqueGraph = async () => {
    takeSnapshot();
    logAction(
      "critique_graph",
      { graphId: currentGraphId || currentGraph?.id },
      profile?.user_id
    );
    // Check if there are any nodes in the graph
    if (nodes.length === 0) {
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content:
            "No nodes found in the graph. Please add some nodes to analyze.",
        },
      ]);
      return;
    }

    setCopilotLoading(true);
    setCopilotMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content:
          "Analyze the entire graph for argument flaws and pattern matches.",
      },
    ]);

    try {
      // Prepare request body with all graph data
      const requestBody = {
        nodes: nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          evidenceIds: node.data.evidenceIds || [],
        })),
        edges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          weight: edge.data.confidence,
        })),
        evidence: evidenceCards,
        supportingDocuments: supportingDocumentsRedux,
      };

      console.log(
        `[GraphCanvas] handleCritiqueGraph: Sending request to /api/ai/critique-graph`
      );
      console.log(
        `[GraphCanvas] handleCritiqueGraph: Request body:`,
        requestBody
      );

      const response = await fetch("/api/ai/critique-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to critique graph.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[GraphCanvas] handleCritiqueGraph: Received response:`,
        data
      );

      // Display overall assessment first
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: {
            "Overall Assessment": data.overall_assessment,
          },
          isStructured: true,
        },
      ]);

      // Display argument flaws
      if (data.argument_flaws && data.argument_flaws.length > 0) {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: `Found ${data.argument_flaws.length} argument flaw(s):`,
          },
        ]);

        data.argument_flaws.forEach((flaw: any, index: number) => {
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "ai",
              content: {
                [`Flaw ${index + 1}: ${flaw.flaw_type}`]: flaw.description,
                Severity: flaw.severity,
                "Affected Nodes": flaw.affected_nodes.join(", "),
                "Affected Edges": flaw.affected_edges.join(", "),
                Reasoning: flaw.reasoning,
              },
              isStructured: true,
            },
          ]);
        });
      } else {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: "No argument flaws detected.",
          },
        ]);
      }

      // Display pattern matches
      if (data.pattern_matches && data.pattern_matches.length > 0) {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: `Found ${data.pattern_matches.length} pattern match(es):`,
          },
        ]);

        data.pattern_matches.forEach((match: any, index: number) => {
          setCopilotMessages((msgs) => [
            ...msgs,
            {
              role: "ai",
              content: {
                [`Pattern ${index + 1}: ${match.pattern_name}`]:
                  match.description,
                Category: match.category,
                "Graph Pattern": match.graph_pattern,
                "Graph Implication": match.graph_implication,
                Severity: match.severity,
                "Matched Nodes": match.matched_nodes.join(", "),
                "Node Claims": match.matched_node_texts.join(" | "),
                "Matched Edges": match.matched_edges.join(", "),
                "Edge Details": match.matched_edge_details.join(" | "),
                "Pattern Details": match.pattern_details,
              },
              isStructured: true,
            },
          ]);
        });
      } else {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: "No pattern matches found.",
          },
        ]);
      }

      // Display recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        setCopilotMessages((msgs) => [
          ...msgs,
          {
            role: "ai",
            content: "Recommendations for improvement:",
          },
        ]);

        data.recommendations.forEach(
          (recommendation: string, index: number) => {
            setCopilotMessages((msgs) => [
              ...msgs,
              {
                role: "ai",
                content: `${index + 1}. ${recommendation}`,
              },
            ]);
          }
        );
      }
    } catch (err: any) {
      console.error(`[GraphCanvas] handleCritiqueGraph: Error:`, err);
      setCopilotMessages((msgs) => [
        ...msgs,
        { role: "ai", content: `Error: ${err.message}` },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // API call function for claim type classification
  const triggerClassifyClaimType = async (nodeId: string) => {
    takeSnapshot();
    logAction("classify_claim_type", { nodeId }, profile?.user_id);
    console.log(
      `[GraphCanvas] triggerClassifyClaimType: Starting classification for node ${nodeId}`
    );

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Node ${nodeId} not found`
      );
      return null;
    }

    try {
      // Get evidence for this node
      const nodeEvidence = evidenceCards.filter((ev) =>
        (node.data.evidenceIds || []).includes(ev.id)
      );

      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Node text: '${node.data.text}'`
      );
      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Node evidence count: ${nodeEvidence.length}`
      );

      const requestBody = {
        node_id: node.id,
        node_text: node.data.text,
        evidence: nodeEvidence,
        claim_type_descriptions: {
          factual: "Verifiable by observation or empirical data.",
          value:
            "Expresses judgments, ethics, or aesthetics; cannot be verified empirically.",
          policy:
            "Proposes actions or changes; includes normative statements like 'should' or 'must'.",
        },
      };

      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Sending request to /api/ai/classify-claim-type`
      );
      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Request body:`,
        requestBody
      );

      const response = await fetch("/api/ai/classify-claim-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to classify claim type for node.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[GraphCanvas] triggerClassifyClaimType: Received response:`,
        data
      );

      // Add classification result to copilot messages
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: {
            "Claim Node ID": data.node_id,
            "Node Title": data.node_text,
            Evaluation: data.evaluation,
            Reasoning: data.reasoning,
            Confidence: `${Math.round(data.confidence * 100)}%`,
          },
          isStructured: true,
        },
      ]);

      // Update the node type if classification is confident enough (confidence > 0.7)
      if (data.confidence > 0.7 && data.evaluation !== "unknown") {
        console.log(
          `[GraphCanvas] triggerClassifyClaimType: Updating node type to ${data.evaluation} (confidence: ${data.confidence})`
        );

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id
              ? {
                ...n,
                data: {
                  ...n.data,
                  type: data.evaluation,
                },
                style: getNodeStyle(data.evaluation),
              }
              : n
          )
        );
      } else {
        console.log(
          `[GraphCanvas] triggerClassifyClaimType: Not updating node type - confidence too low (${data.confidence}) or evaluation is unknown`
        );
      }

      return data;
    } catch (err: any) {
      console.error(`[GraphCanvas] triggerClassifyClaimType: Error:`, err);
      setCopilotMessages((msgs) => [
        ...msgs,
        {
          role: "ai",
          content: `Error classifying claim type for node ${nodeId}: ${err.message}`,
          isStructured: false,
        },
      ]);
      return null;
    }
  };

  return (
    <div className="w-full h-full relative font-[DM Sans]">
      <PanelGroup direction="horizontal" autoSaveId="graph-editor-panels-v1">
        {/* Evidence Panel Container */}
        {isEvidencePanelOpen && (
          <Panel defaultSize={22} minSize={12} maxSize={30}>
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
                    className="px-3 py-1.5 bg-[#232F3E] text-[#F3F4F6] rounded-md hover:bg-[#1A2330] transition-colors text-sm font-[DM Sans] font-normal"
                    onClick={() => setIsAddEvidenceOpen(true)}
                  >
                    + Add Evidence
                  </button>
                </div>
                {/* Evidence cards */}
                <div className="space-y-3">
                  {evidenceCards.filter((card) => !card.id.includes("_"))
                    .length === 0 ? (
                    <div className="p-4 bg-[#FAFAFA] rounded-md border border-gray-300 text-center text-gray-500 text-sm font-medium">
                      No evidence added yet.
                    </div>
                  ) : (
                    // Only show original (non-cloned) evidence cards
                    evidenceCards
                      .filter((card) => !card.id.includes("_"))
                      .map((card) => {
                        const doc = supportingDocuments.find(
                          (d) => d.id === card.supportingDocId
                        );
                        const isImage = doc?.type === "image";
                        return (
                          <div
                            key={card.id}
                            className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 cursor-pointer relative group"
                            onClick={() => setSelectedEvidenceCard(card)}
                            draggable
                            onDragStart={(e) =>
                              handleEvidenceDragStart(e, card.id)
                            }
                          >
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvidence(card.id);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              aria-label="Delete evidence"
                            >
                              ×
                            </button>

                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-base font-medium">
                                    {card.title}
                                  </span>

                                  <span className="text-sm text-gray-500 font-medium">
                                    source: {card.supportingDocName}
                                  </span>
                                </div>
                                <div className="text-xs font-normal text-gray-400 mt-1 line-clamp-2 whitespace-pre-line truncate">
                                  Excerpt:{card.excerpt}
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
                  <div
                    className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-4 relative"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <h2 className="text-xl font-bold mb-1 text-black">
                      Add Evidence
                    </h2>
                    <p className="text-black text-sm mb-3 font-normal">
                      Create evidence from your supporting documents
                    </p>
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
                            confidence: 0,
                          },
                        ]);
                        closeEvidenceModal();
                      }}
                      className="space-y-3"
                    >
                      {/* Title */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-black text-sm font-medium"
                          htmlFor="title"
                        >
                          Title
                        </label>
                        <input
                          id="title"
                          type="text"
                          className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          style={{ color: "#000000", fontWeight: 500 }}
                          value={newEvidence.title}
                          onChange={(e) =>
                            setNewEvidence((ev) => ({
                              ...ev,
                              title: e.target.value,
                            }))
                          }
                          placeholder="e.g. Research findings on climate change"
                          required
                        />
                      </div>

                      {/* Supporting Doc Select */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-black text-sm font-medium"
                          htmlFor="supportingDoc"
                        >
                          Supporting Document
                        </label>
                        <select
                          id="supportingDoc"
                          className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          style={{ color: "#000000", fontWeight: 500 }}
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

                      {/* Node Selection - only show when a document is selected */}
                      {newEvidence.supportingDocId && (
                        <div className="flex flex-col gap-1">
                          <label
                            className="text-black text-sm font-medium"
                            htmlFor="associatedNode"
                          >
                            Associated Node (Optional but Required for AI
                            Suggestions)
                          </label>
                          <select
                            id="associatedNode"
                            className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ color: "#000000", fontWeight: 500 }}
                            value={newEvidence.selectedNodeId}
                            onChange={(e) =>
                              setNewEvidence((ev) => ({
                                ...ev,
                                selectedNodeId: e.target.value,
                              }))
                            }
                          >
                            <option value="">
                              Select a node (optional)...
                            </option>
                            {nodes.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.data.text
                                  ? `${node.data.text} (${node.data.type || "unknown"
                                  })`
                                  : `Node ${node.id} (${node.data.type || "unknown"
                                  })`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Document Preview and Excerpt Section */}
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
                                  <label className="text-black text-sm font-medium mb-1">
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
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-white hover:bg-[#1A2330] font-medium transition-colors"
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
                                  Add Content
                                </button>

                                {/* Document-specific buttons - only show when type is document */}
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-white hover:bg-[#1A2330] font-medium transition-colors mt-2"
                                  onClick={handleSuggestContent}
                                  disabled={suggestLoading || !newEvidence.selectedNodeId}
                                >
                                  {suggestLoading
                                    ? "Suggesting..."
                                    : "AI Suggest Text"}
                                </button>
                                {suggestError && (
                                  <div className="text-red-500 text-sm mt-2">
                                    {suggestError}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-white hover:bg-[#1A2330] font-medium transition-colors mt-2"
                                  onClick={handleExtractAllText}
                                  disabled={extractLoading}
                                >
                                  {extractLoading
                                    ? "Extracting..."
                                    : "Extract All Text"}
                                </button>
                                {extractError && (
                                  <div className="text-red-500 text-sm mt-2">
                                    {extractError}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 flex flex-col">
                                <label className="text-black text-sm font-medium mb-1">
                                  Excerpt / Lines
                                </label>
                                <textarea
                                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  style={{
                                    color: "#000000",
                                    fontWeight: 500,
                                    height: "450px"
                                  }}
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
                                <label className="text-black text-sm font-medium mb-1">
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
                                  className="px-4 py-2 rounded-md bg-[#232F3E] text-white hover:bg-[#1A2330] text-base font-medium whitespace-pre-line text-center"
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
                                              "Content-Type": "application/json",
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
                              <div className="flex-1 flex flex-col">
                                <label className="text-black text-sm font-medium mb-1">
                                  Excerpt / Lines
                                </label>
                                <textarea
                                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  style={{
                                    color: "#000000",
                                    fontWeight: 500,
                                    height: "450px"
                                  }}
                                  placeholder="Paste or type the relevant excerpt or lines here... Alternatively, click 'Parse Text' to extract text from the image."
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
                      <div className="flex gap-3 justify-end mt-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
                          onClick={closeEvidenceModal}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#232F3E] text-white rounded-md hover:bg-[#1A2330] transition-colors font-medium text-sm"
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
                        onClick={handleUpload}
                        className="px-3 py-1.5 bg-[#232F3E] text-[#F3F4F6] rounded-md hover:bg-[#1A2330] transition-colors text-sm cursor-pointer font-[DM Sans] font-normal flex items-center gap-2"
                        title="Upload"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                    {/* Documents List */}
                    <div className="space-y-3">
                      {supportingDocuments.length === 0 ? (
                        <div className="p-4 bg-[#FAFAFA] rounded-md border border-gray-300 text-center text-gray-500 text-sm font-medium">
                          <p className="text-gray-500 text-sm font-normal">
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
                                  <span className="text-base font-medium">
                                    {doc.name}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">
                                    ({doc.type})
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 font-normal">
                                  Uploaded by {doc.uploader}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 font-normal">
                                  Uploaded {doc.uploadDate.toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors font-bold"
                                >
                                  <span className="text-lg">↗</span>
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-500 transition-colors font-bold"
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
        <Panel minSize={40}>
          <div className="relative h-full">
            {/* Top Navigation Bars Container */}
            {!hideNavbar && (
              <div
                className={`absolute top-6 z-10 ${isEvidencePanelOpen && isAICopilotOpen
                  ? "left-6 flex flex-col items-start gap-2" // stacked: content width only, left aligned
                  : "left-6 right-6 flex justify-between" // single row: keep original behavior
                  }`}
              >
                {/* Floating Top Left Navbar */}
                <div className="bg-white rounded-lg shadow-lg px-3 py-1.5 w-fit">
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
                            fontWeight: "500",
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setIsEditing(true)}
                          className="cursor-pointer hover:bg-gray-100 px-0.5 py-0 rounded text-lg text-center w-full"
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontWeight: "500",
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
                          {/* Download logs inside menu */}
                          <button
                            onClick={() => {
                              downloadActionLog();
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                            Download User Actions Log
                          </button>
                          <button
                            onClick={() => {
                              downloadApiLog();
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <DocumentTextIcon className="w-5 h-5" />
                            Download API Calls Log
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating Top Right Navbar */}
                <div className="bg-white rounded-lg shadow-md px-2 py-1 w-fit self-start">
                  <div className="flex items-center gap-3">
                    {/* Undo/Redo Buttons */}
                    <button
                      onClick={undo}
                      disabled={!canUndo}
                      className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${canUndo
                        ? "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                        : "text-gray-300 cursor-not-allowed"
                        }`}
                      title="Undo"
                    >
                      <ArrowUturnLeftIcon className="w-7 h-7" strokeWidth={2} />
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo}
                      className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${canRedo
                        ? "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                        : "text-gray-300 cursor-not-allowed"
                        }`}
                      title="Redo"
                    >
                      <ArrowUturnRightIcon
                        className="w-7 h-7"
                        strokeWidth={2}
                      />
                    </button>

                    <div className="h-10 w-px bg-gray-200"></div>

                    {/* Import, Export, Save, and Generate Report Buttons */}
                    {/* Download Logs moved to left menu - buttons removed from here */}
                    <button
                      onClick={handleImport}
                      className="p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                      title="Import"
                    >
                      <ArrowUpTrayIcon className="w-7 h-7" strokeWidth={2} />
                    </button>
                    <LoadingSuccessButton
                      onClick={handleExport}
                      icon={ArrowDownTrayIcon}
                      title="Export"
                      loadingText="Exporting..."
                      successText="Exported"
                    />
                    <LoadingSuccessButton
                      onClick={handleCritiqueGraph}
                      icon={DocumentMagnifyingGlassIcon}
                      title="Critique Graph"
                      loadingText="Critiquing..."
                      successText="Critiqued"
                    />
                    <LoadingSuccessButton
                      onClick={handleGenerateReport}
                      icon={DocumentIcon}
                      title="Generate Report"
                      loadingText="Generating..."
                      successText="Generated"
                      disabled={isGeneratingReport}
                    />

                    {/* Save moved to be the rightmost action, just left of profile */}
                    <LoadingSuccessButton
                      onClick={handleSave}
                      icon={FloppyDiskIcon}
                      title="Save"
                      loadingText="Saving..."
                      successText="Saved"
                    />

                    <div className="h-10 w-px bg-gray-200"></div>

                    {/* Profile Icon and Dropdown */}
                    <div className="relative" ref={profileRef}>
                      <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-10 h-10 rounded-full bg-[#232F3E] text-white flex items-center justify-center text-lg font-semibold hover:bg-[#2d3b4d] transition-colors"
                      >
                        <span className="pt-0.5">
                          {profile?.first_name?.[0]}
                        </span>
                      </button>
                      {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                          <div className="px-4 py-2 text-sm text-gray-700">
                            <div className="font-medium">
                              {profile?.first_name} {profile?.last_name}
                            </div>
                            <div className="text-gray-500 truncate">
                              {profile?.email}
                            </div>
                          </div>
                          <div className="w-full h-px bg-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              router.push("/graph-manager");
                              setIsProfileOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                          >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            Back to Graph Manager
                          </button>
                          <div className="w-full h-px bg-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              handleLogout();
                              setIsProfileOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
                          >
                            <ArrowUturnRightIcon className="w-4 h-4" />
                            Log Out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tools Navbar */}
            <div
              className={`absolute left-6 z-10 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-4 w-[60px] ${isEvidencePanelOpen && isAICopilotOpen && !hideNavbar
                ? "top-36"
                : "top-24"
                }`}
            >
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
                  <div className="absolute left-full top-0 ml-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 min-w-[180px] z-10 text-lg">
                    <button
                      onClick={() => addNode("factual")}
                      className="w-full text-left pl-5 pr-2 py-2.5 text-gray-500 font-normal hover:bg-[#aeaeae] hover:text-black text-lg transition-colors"
                    >
                      Factual
                    </button>
                    <button
                      onClick={() => addNode("value")}
                      className="w-full text-left pl-5 pr-2  py-2.5 text-gray-500 font-normal hover:bg-[#94bc84] hover:text-black text-lg transition-colors"
                    >
                      Value
                    </button>
                    <button
                      onClick={() => addNode("policy")}
                      className="w-full text-left pl-5 pr-2 py-2.5 text-gray-500 font-normal hover:bg-[#91A4C2] hover:text-black text-lg transition-colors"
                    >
                      Policy
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Button (works for node or edge) */}
              <button
                onClick={() => {
                  if (selectedEdge) {
                    handleDeleteEdge();
                  } else if (selectedNode) {
                    handleDeleteNode();
                  }
                }}
                disabled={!selectedNode && !selectedEdge}
                className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${selectedNode || selectedEdge
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700 hover:scale-105 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
                  }`}
                title={selectedEdge ? "Delete Edge" : "Delete Claim"}
              >
                <TrashIcon className="w-8 h-8" strokeWidth={2} />
              </button>

              <div className="w-full h-px bg-gray-200"></div>

              {/* Edge Creation Type Toggle */}
              <div className="flex flex-col gap-2" title="Edge Type">
                <button
                  onClick={() => setEdgeCreationType("supporting")}
                  className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${edgeCreationType === "supporting"
                    ? "bg-[#166534] bg-opacity-20 text-[#166534]"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                  aria-pressed={edgeCreationType === "supporting"}
                >
                  <ArrowTrendingUpIcon className="w-8 h-8" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setEdgeCreationType("attacking")}
                  className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${edgeCreationType === "attacking"
                    ? "bg-[#991B1B] bg-opacity-20 text-[#991B1B]"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                  aria-pressed={edgeCreationType === "attacking"}
                >
                  <ArrowTrendingDownIcon className="w-8 h-8" strokeWidth={2} />
                </button>
              </div>

              <div className="w-full h-px bg-gray-200"></div>

              {/* Notes Manager Toggle */}
              <button
                onClick={openNotesManager}
                className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${isNotesOpen
                  ? "bg-[#232F3E] text-white shadow-inner"
                  : "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                  }`}
                title="Notes"
              >
                <ClipboardDocumentListIcon
                  className="w-8 h-8"
                  strokeWidth={2}
                />
              </button>

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

              <div className="w-full h-px bg-gray-200"></div>

              {/* Argument Input Button */}
              <button
                onClick={handleOpenTextArea}
                className="p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                title="Argument Input Area"
              >
                <PlusIcon className="w-8 h-8" strokeWidth={2} />
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
              maxZoom={30}
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
                  edgeScore: 0,
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

            {/* Properties Modals beside AI Copilot (position synced to copilot width) */}
            {(selectedNode || selectedEdge) && (
              <div style={{ position: "fixed", top: 0 }}>
                {selectedNode && !selectedEdge && (
                  <NodeProperties
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onUpdate={handleNodeUpdate}
                    evidenceCards={evidenceCards}
                    supportingDocuments={supportingDocuments}
                    onUpdateEvidenceConfidence={handleUpdateEvidenceConfidence}
                    onUnlinkEvidence={handleUnlinkEvidence}
                    copilotOpen={isAICopilotOpen}
                    copilotOffsetPx={isAICopilotOpen ? copilotWidthPx : 0}
                    onClassifyClaimType={triggerClassifyClaimType}
                    onCloneEvidence={cloneEvidence}
                    evaluationMessages={copilotMessages.filter(
                      (
                        msg
                      ): msg is {
                        role: string;
                        content: {
                          "Evidence ID": string;
                          Evaluation: string;
                          Reasoning: string;
                          Confidence: string;
                        };
                        isStructured: boolean;
                      } =>
                        msg.role === "ai" &&
                        msg.isStructured === true &&
                        typeof msg.content === "object" &&
                        msg.content !== null &&
                        "Evidence ID" in msg.content &&
                        "Evaluation" in msg.content &&
                        "Reasoning" in msg.content &&
                        "Confidence" in msg.content
                    )}
                  />
                )}
                {selectedEdge && !selectedNode && (
                  <EdgeProperties
                    edge={selectedEdge}
                    onClose={() => setSelectedEdge(null)}
                    onUpdate={handleEdgeUpdate}
                    copilotOpen={isAICopilotOpen}
                    copilotOffsetPx={isAICopilotOpen ? copilotWidthPx : 0}
                    nodes={nodes}
                    evidenceCards={evidenceCards}
                    supportingDocuments={supportingDocumentsRedux}
                    onValidateEdge={handleValidateEdge}
                    edgeReasoning={(() => {
                      // Fallback: derive the most recent reasoning for this edge from copilot messages
                      try {
                        const sourceText = nodes.find(
                          (n) => n.id === selectedEdge.source
                        )?.data.text;
                        const targetText = nodes.find(
                          (n) => n.id === selectedEdge.target
                        )?.data.text;
                        const matches = copilotMessages
                          .filter(
                            (
                              msg
                            ): msg is {
                              role: string;
                              content: any;
                              isStructured?: boolean;
                            } =>
                              msg.role === "ai" &&
                              (msg as any).isStructured === true &&
                              typeof msg.content === "object" &&
                              msg.content !== null &&
                              "Edge Source" in msg.content &&
                              "Edge Target" in msg.content &&
                              "Reasoning" in msg.content
                          )
                          .filter((msg) => {
                            const c = msg.content as any;
                            return (
                              (!sourceText ||
                                c["Edge Source"] === sourceText) &&
                              (!targetText || c["Edge Target"] === targetText)
                            );
                          });
                        const last = matches[matches.length - 1];
                        return last
                          ? String((last.content as any)["Reasoning"] || "")
                          : "";
                      } catch {
                        return "";
                      }
                    })()}
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
          <Panel defaultSize={24} minSize={12} maxSize={30}>
            <div
              ref={copilotRef}
              className={`h-full border-l flex flex-col font-[DM Sans] ${activeTab === "console"
                ? "bg-[#232F3E] text-gray-200 border-black"
                : "bg-white text-black border-black"
                }`}
            >
              {/* AI Copilot Header */}
              <div
                className={`p-4 border-b flex justify-between items-center relative ${activeTab === "console"
                  ? "bg-[#232F3E] text-gray-200 border-[#2f3b4a]"
                  : "bg-white text-black border-black"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <SparklesIcon
                    className={`w-6 h-6 ${activeTab === "console"
                      ? "text-purple-300"
                      : "text-purple-500"
                      }`}
                  />
                  <h2
                    className="text-lg tracking-wide uppercase"
                    style={{
                      fontWeight: "600",
                    }}
                  >
                    AI Copilot
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAICopilotFrozen((f) => !f)}
                    className={`p-2 rounded-full transition-colors ${activeTab === "console"
                      ? isAICopilotFrozen
                        ? "bg-[#1f2937]"
                        : "hover:bg-[#1f2937]"
                      : isAICopilotFrozen
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
                      }`}
                    title={
                      isAICopilotFrozen
                        ? "Unfreeze Copilot Panel"
                        : "Freeze Copilot Panel"
                    }
                  >
                    {isAICopilotFrozen ? (
                      <LockClosedIcon
                        className={`w-5 h-5 ${activeTab === "console"
                          ? "text-blue-300"
                          : "text-blue-600"
                          }`}
                      />
                    ) : (
                      <LockOpenIcon
                        className={`w-5 h-5 ${activeTab === "console"
                          ? "text-gray-300"
                          : "text-gray-400"
                          }`}
                      />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      !isAICopilotFrozen && setIsAICopilotOpen(false)
                    }
                    className={`p-2 rounded-md transition-colors ${activeTab === "console"
                      ? "hover:bg-[#1f2937] text-gray-200"
                      : "hover:bg-white"
                      } ${isAICopilotFrozen ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    aria-label="Close AI copilot"
                    disabled={isAICopilotFrozen}
                  >
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div
                className={`flex border-b ${activeTab === "console"
                  ? "bg-[#232F3E] border-[#2f3b4a]"
                  : "border-gray-200"
                  }`}
              >
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 px-4 py-3 text-sm transition-colors ${activeTab === "chat"
                    ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                    : activeTab === "console"
                      ? "text-gray-300 hover:bg-[#1f2937]"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  style={{
                    fontWeight: "500",
                  }}
                >
                  AI Copilot
                </button>
                <button
                  onClick={() => setActiveTab("console")}
                  className={`flex-1 px-4 py-3 text-sm transition-colors ${activeTab === "console"
                    ? "text-white border-b-2 border-purple-400 bg-transparent"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  style={{
                    fontWeight: "500",
                  }}
                >
                  Console
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "chat" ? (
                <>
                  {/* Chat Area */}
                  <div className="flex-1 overflow-auto p-4">
                    <div
                      className="text-center text-gray-500 mt-2 mb-4"
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: "500",
                      }}
                    >
                      Chat with AI Copilot about your graph
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-3 mb-4">
                      {/* Welcome message */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 max-w-[80%]">
                          <p
                            className="text-sm text-gray-800"
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontWeight: "400",
                              lineHeight: "1.5",
                            }}
                          >
                            Hello! I'm your AI Copilot. I can help you analyze
                            your argument graph, validate claims, check
                            evidence, and much more. What would you like to work
                            on?
                          </p>
                        </div>
                      </div>

                      {/* Dynamic chat messages */}
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          {msg.role === "user" ? (
                            <>
                              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-medium">
                                  U
                                </span>
                              </div>
                              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%] ml-auto">
                                <p
                                  className="text-sm text-gray-800"
                                  style={{
                                    fontFamily: "DM Sans, sans-serif",
                                    fontWeight: "400",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {msg.content}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-4 h-4 text-white" />
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3 max-w-[80%]">
                                <p
                                  className="text-sm text-gray-800"
                                  style={{
                                    fontFamily: "DM Sans, sans-serif",
                                    fontWeight: "400",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {msg.content}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Loading indicator */}
                      {copilotLoading && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                              <span className="text-sm text-gray-600">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-gray-200 p-4">
                    <form onSubmit={handleChatSubmit} className="relative mb-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={handleChatInputChange}
                        placeholder="Ask me anything about your graph..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: "400",
                        }}
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-600"
                        disabled={!chatInput.trim()}
                      >
                        <SparklesIcon className="w-5 h-5" />
                      </button>
                    </form>
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={handleClearChat}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-sm border border-gray-300 transition-all"
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: "500",
                        }}
                        type="button"
                      >
                        Clear Chat
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Console Area - Terminal themed */}
                  <div className="flex-1 overflow-auto bg-[#232F3E] text-gray-200 font-mono text-base">
                    <div className="px-4 py-2 text-xs text-gray-300 border-b border-[#2f3b4a]">
                      Console ready.
                    </div>
                    {/* Command buttons commented out in Console */}
                    {/**
                    <CommandMessageBox
                      title="Check All Claim Evidence"
                      content="Check evidence for each claim and evaluate relationship"
                      icon={<DocumentMagnifyingGlassIcon className="w-4 h-4" />}
                      onClick={handleCheckEvidence}
                      disabled={copilotLoading}
                    />
                    <CommandMessageBox
                      title="Get Claim Credibility"
                      content="Compute credibility scores for each node using internal evidence scores, and apply propagation algorithm."
                      icon={<DocumentCheckIcon className="w-4 h-4" />}
                      onClick={handleClaimCredibility}
                      disabled={copilotLoading}
                    />
                    <CommandMessageBox
                      title="Validate All Edges"
                      content="Checks all edges for support/attack/neutral and outputs reasoning for each."
                      icon={<ArrowPathIcon className="w-4 h-4" />}
                      onClick={validate_edges}
                      disabled={copilotLoading}
                    />
                    <CommandMessageBox
                      title="Generate All Assumptions"
                      content="Generates assumptions for all edges in the graph sequentially"
                      icon={<HandRaisedIcon className="w-4 h-4" />}
                      onClick={handleGenerateAllAssumptions}
                      disabled={copilotLoading}
                    />
                    */}
                    <div className="mt-0">
                      {copilotMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 border-b border-[#2f3b4a] whitespace-pre-wrap"
                        >
                          {msg.isStructured ? (
                            <div className="bg-white text-black rounded-md p-3">
                              <MessageBox message={msg.content} />
                            </div>
                          ) : msg.role === "assistant" ? (
                            <span
                              className="text-gray-200"
                              dangerouslySetInnerHTML={{ __html: msg.content }}
                            />
                          ) : msg.role === "system" ? (
                            <span className="text-gray-400">{msg.content}</span>
                          ) : (
                            <span className="text-gray-200">{msg.content}</span>
                          )}
                        </div>
                      ))}
                      {copilotLoading && (
                        <div className="px-4 py-2 text-purple-300 text-xs">
                          Processing...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Console Controls (no input) */}
                  <div className="border-t border-[#2f3b4a] p-3 bg-[#232F3E]">
                    <div className="flex justify-center">
                      <button
                        onClick={handleClearCopilotChat}
                        className="px-5 py-2 rounded-md text-sm bg-[#0f172a] hover:bg-[#111827] text-white border border-[#334155]"
                        type="button"
                      >
                        Clear Console
                      </button>
                    </div>
                  </div>
                </>
              )}
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

      {/* Notes Modals */}
      <NotesManagerModal
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        notes={notes}
        onCreate={handleCreateNote}
        onEdit={(n) => {
          setIsNotesOpen(false);
          handleEditNote(n);
        }}
        onDelete={handleDeleteNote}
      />
      <NoteEditorModal
        open={isNoteEditorOpen}
        onClose={() => setIsNoteEditorOpen(false)}
        initialNote={editingNote}
        onSave={handleSaveNote}
      />

      {/* Text Area Modal */}
      {isTextAreaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-semibold text-gray-900"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: "600" }}
              >
                Argument Input Area
              </h3>
              <button
                onClick={handleCloseTextArea}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                value={textAreaContent}
                onChange={(e) => setTextAreaContent(e.target.value)}
                placeholder="Enter your argument here"
                className="w-full h-full min-h-[400px] p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "16px",
                }}
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCloseTextArea}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: "500" }}
              >
                Close
              </button>
              <button
                onClick={handleProcessTextWithLLM}
                className="px-4 py-2 bg-[#232F3E] text-white rounded-md hover:bg-[#1A2330] transition-colors font-medium"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: "500" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Toast */}
      {showProgressToast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <div>
              <div className="font-medium">Generating Report</div>
              <div className="text-sm opacity-90">{reportProgress}</div>
            </div>
          </div>
        </div>
      )}
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
