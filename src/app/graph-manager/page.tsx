"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadGraphs,
  setSelectedGraph,
  createGraph,
  setCurrentGraph,
  deleteGraph,
} from "../../store/slices/graphsSlice";
import type { RootState } from "../../store";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import ContinueButton from "../../components/ContinueButton";
import Navbar from "../../components/Navbar";
import { fetchUserData } from "../../store/slices/userSlice";
import type { Evidence, ClaimType } from "../../types/graph";

// Placeholder for GraphCard and GraphModal components

// Define a type for Graph
interface Graph {
  id: string;
  graph_name: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  graph_data: {
    evidence: Evidence[];
    nodes: Array<{
      id: string;
      text: string;
      type: ClaimType;
      author: string | undefined;
      belief: number;
      position: { x: number; y: number };
      created_on: string;
      evidenceIds: string[];
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      weight: number;
    }>;
  };
  new?: boolean;
}

export default function GraphManagerPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const graphs = useSelector(
    (state: RootState) => state.graphs.items as Graph[]
  );
  const selected = useSelector(
    (state: RootState) => state.graphs.selected as string | null
  );
  const loading = useSelector((state: RootState) => state.graphs.loading);
  const error = useSelector((state: RootState) => state.graphs.error);
  const userEmail = useSelector(
    (state: RootState) => state.user.profile?.email
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGraphName, setNewGraphName] = useState("");
  const [isNavbarOpen, setNavbarOpen] = useState(false);
  const currentGraph = useSelector(
    (state: RootState) => state.graphs.currentGraph as Graph | null
  );
  const [supportingDocCount, setSupportingDocCount] = useState<number | null>(
    null
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      console.log(
        "[GraphManagerPage] No access token found, redirecting to signin"
      );
      router.push("/signin");
      return;
    }

    console.log("[GraphManagerPage] Loading user data with token");
    dispatch(fetchUserData(accessToken) as any);
  }, [dispatch, router]);

  useEffect(() => {
    if (userEmail) {
      console.log("[GraphManagerPage] Loading graphs for:", userEmail);
      dispatch(loadGraphs(userEmail) as any);
    }
  }, [dispatch, userEmail]);

  useEffect(() => {
    if (selected) {
      setSupportingDocCount(null); // reset
      fetch(`/api/supporting-documents/count?graph_id=${selected}`)
        .then((res) => res.json())
        .then((data) =>
          setSupportingDocCount(
            typeof data.count === "number" ? data.count : null
          )
        )
        .catch(() => setSupportingDocCount(null));
    }
  }, [selected]);

  // Debug logs for modal state
  useEffect(() => {
    if (selected || currentGraph) {
      console.log("[GraphManagerPage][Modal Debug] selected:", selected);
      console.log(
        "[GraphManagerPage][Modal Debug] currentGraph:",
        currentGraph
      );
    }
  }, [selected, currentGraph]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black p-4">
        <Header onMenuClick={() => setNavbarOpen(true)} />
        <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black p-4">
        <Header onMenuClick={() => setNavbarOpen(true)} />
        <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => setNavbarOpen(true)} />
      <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1
            className="text-3xl font-bold text-black"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Your Graphs
          </h1>
          <div className="w-32">
            <ContinueButton
              onClick={() => {
                console.log("[GraphManagerPage] New Graph button clicked");
                setIsCreateModalOpen(true);
              }}
              className="w-full !bg-[#232F3E] !text-white hover:!bg-[#1a2530] focus:!ring-[#232F3E] transition-colors font-medium"
            >
              New Graph
            </ContinueButton>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          {graphs && graphs.length > 0 ? (
            graphs.map((graph) => (
              <div
                key={graph.id}
                className="relative w-80 h-56 rounded-xl shadow-lg cursor-pointer overflow-hidden group"
                onClick={async () => {
                  console.log("[GraphManagerPage] Graph card clicked:", graph);
                  try {
                    // First set the selected graph ID to show the modal
                    dispatch(setSelectedGraph(graph.id));

                    // Then fetch the complete graph data
                    const accessToken = localStorage.getItem("access_token");
                    if (!accessToken) {
                      throw new Error("No access token found");
                    }

                    const response = await fetch(`/api/graphs/${graph.id}`, {
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                      },
                    });

                    if (!response.ok) {
                      throw new Error("Failed to fetch graph data");
                    }

                    const completeGraphData = await response.json();
                    console.log(
                      "[GraphManagerPage][Click Handler Debug] completeGraphData:",
                      completeGraphData
                    );
                    dispatch(setCurrentGraph(completeGraphData));
                    console.log(
                      "[GraphManagerPage][Click Handler Debug] setCurrentGraph dispatched"
                    );
                  } catch (error) {
                    console.error(
                      "[GraphManagerPage] Error fetching graph data:",
                      error
                    );
                    alert("Failed to load graph data. Please try again.");
                  }
                }}
              >
                {/* Background image */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src="/graphIcon.png"
                    alt="Graph Icon"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                </div>
                {/* Content overlay */}
                <div
                  className="relative z-20 p-4 h-full flex flex-col justify-end"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {graph.graph_name}
                  </h3>
                  <p className="text-m text-gray-200 font-normal">
                    Last updated: {new Date(graph.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div
              className="w-full text-center text-gray-600"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <p className="text-lg font-normal">No graphs created yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Graph Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-8 max-w-lg w-full mx-4"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {currentGraph && currentGraph.id === selected ? (
              <>
                <h2 className="text-2xl font-bold mb-6 text-black">
                  {currentGraph.graph_name}
                </h2>
                <p className="text-black text-lg mb-6 font-normal">
                  Graph Details
                </p>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-base font-medium mb-1">
                      Nodes
                    </div>
                    <div className="text-xl font-bold text-black">
                      {currentGraph.graph_data?.nodes?.length || 0}
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-base font-medium mb-1">
                      Connections
                    </div>
                    <div className="text-xl font-bold text-black">
                      {currentGraph.graph_data?.edges?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-base font-medium mb-1">
                      Evidence
                    </div>
                    <div className="text-xl font-bold text-black">
                      {currentGraph.graph_data?.evidence?.length || 0}
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-base font-medium mb-1">
                      Supporting Documents
                    </div>
                    <div className="text-xl font-bold text-black">
                      {supportingDocCount !== null
                        ? supportingDocCount
                        : "Loading..."}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="text-gray-600 text-base font-medium mb-1">
                    Created On
                  </div>
                  <div className="text-black">
                    {currentGraph.created_at
                      ? new Date(currentGraph.created_at).toLocaleString()
                      : "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="text-gray-600 text-base font-medium mb-1">
                    Last Modified
                  </div>
                  <div className="text-black">
                    {currentGraph.updated_at
                      ? new Date(currentGraph.updated_at).toLocaleString()
                      : "N/A"}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
                  >
                    Delete Graph
                  </button>
                  <div className="flex gap-4">
                    <button
                      onClick={() => dispatch(setSelectedGraph(null))}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/graph-editor?id=${currentGraph.id}`);
                      }}
                      className="px-4 py-2 bg-[#232F3E] text-white rounded-md hover:bg-[#5f6fc0] transition-colors font-medium"
                    >
                      Edit Graph
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#232F3E] mb-4"></div>
                <div className="text-black font-medium">
                  Loading graph details...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Graph Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-8 max-w-md w-full mx-4"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <h2 className="text-2xl font-bold mb-2 text-black">
              Create New Graph
            </h2>
            <p className="text-black text-lg mb-6 font-normal">
              Enter a name for your new argument graph
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <label
                className="text-black text-base font-medium"
                htmlFor="graphName"
              >
                Graph Name
              </label>
              <input
                id="graphName"
                type="text"
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                placeholder="e.g. My First Graph"
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: "#000000", fontWeight: 500 }}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <ContinueButton
                onClick={async () => {
                  console.log("[GraphModal] Create button clicked");
                  if (userEmail) {
                    try {
                      console.log(
                        "Starting graph creation with name:",
                        newGraphName || "Untitled Graph"
                      );
                      const result = await dispatch(
                        createGraph({
                          name: newGraphName || "Untitled Graph",
                          email: userEmail,
                        }) as any
                      );

                      console.log("Graph creation result:", result);

                      if (result.payload?.id) {
                        console.log(
                          "Graph created successfully with ID:",
                          result.payload.id
                        );
                        console.log(
                          "Setting current graph in store:",
                          result.payload
                        );
                        dispatch(setCurrentGraph(result.payload));
                        console.log("Navigating to graph editor...");
                        router.push(`/graph-editor?id=${result.payload.id}`);
                      } else {
                        console.error(
                          "No graph ID returned from creation:",
                          result
                        );
                        alert("Failed to create graph. Please try again.");
                      }
                    } catch (error) {
                      console.error("Error creating graph:", error);
                      alert("Failed to create graph. Please try again.");
                    }
                  }
                  setIsCreateModalOpen(false);
                }}
                className="w-auto px-6 !bg-[#232F3E] !text-white hover:!bg-[#1a2530] focus:!ring-[#232F3E]"
              >
                Create
              </ContinueButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && currentGraph && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-black">Delete Graph</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "
              <span className="font-semibold">{currentGraph.graph_name}</span>"?
              This action cannot be undone and will permanently delete:
            </p>
            <ul className="text-gray-600 mb-6 ml-4 list-disc list-inside space-y-1">
              <li>The graph and all its nodes and connections</li>
              <li>All supporting document records</li>
              <li>All uploaded files from storage</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log(
                      "[GraphManagerPage] Deleting graph:",
                      currentGraph.id
                    );
                    const result = await dispatch(
                      deleteGraph(currentGraph.id) as any
                    );

                    if (result.error) {
                      throw new Error(
                        result.error.message || "Failed to delete graph"
                      );
                    }

                    console.log(
                      "[GraphManagerPage] Graph deleted successfully"
                    );

                    // Close both modals
                    setIsDeleteConfirmOpen(false);
                    dispatch(setSelectedGraph(null));

                    // Optionally show a success message
                    alert("Graph deleted successfully");
                  } catch (error) {
                    console.error(
                      "[GraphManagerPage] Error deleting graph:",
                      error
                    );
                    alert("Failed to delete graph. Please try again.");
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
