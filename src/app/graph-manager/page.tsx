"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadGraphs, setSelectedGraph, createGraph, setCurrentGraph } from "../../store/slices/graphsSlice";
import type { RootState } from "../../store";
import Image from 'next/image';
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
    const graphs = useSelector((state: RootState) => state.graphs.items as Graph[]);
    const selected = useSelector((state: RootState) => state.graphs.selected as string | null);
    const loading = useSelector((state: RootState) => state.graphs.loading);
    const error = useSelector((state: RootState) => state.graphs.error);
    const userEmail = useSelector((state: RootState) => state.user.profile?.email);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGraphName, setNewGraphName] = useState("");
    const [isNavbarOpen, setNavbarOpen] = useState(false);
    const currentGraph = useSelector((state: RootState) => state.graphs.currentGraph as Graph | null);
    const [supportingDocCount, setSupportingDocCount] = useState<number | null>(null);

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            console.log('[GraphManagerPage] No access token found, redirecting to signin');
            router.push('/signin');
            return;
        }

        console.log('[GraphManagerPage] Loading user data with token');
        dispatch(fetchUserData(accessToken) as any);
    }, [dispatch, router]);

    useEffect(() => {
        if (userEmail) {
            console.log('[GraphManagerPage] Loading graphs for:', userEmail);
            dispatch(loadGraphs(userEmail) as any);
        }
    }, [dispatch, userEmail]);

    useEffect(() => {
        if (selected) {
            setSupportingDocCount(null); // reset
            fetch(`/api/supporting-documents/count?graph_id=${selected}`)
                .then(res => res.json())
                .then(data => setSupportingDocCount(typeof data.count === 'number' ? data.count : null))
                .catch(() => setSupportingDocCount(null));
        }
    }, [selected]);

    // Debug logs for modal state
    useEffect(() => {
        if (selected || currentGraph) {
            console.log('[GraphManagerPage][Modal Debug] selected:', selected);
            console.log('[GraphManagerPage][Modal Debug] currentGraph:', currentGraph);
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
                    <h1 className="text-2xl font-bold text-black">Your Graphs</h1>
                    <div className="w-32">
                        <ContinueButton
                            onClick={() => {
                                console.log('[GraphManagerPage] New Graph button clicked');
                                setIsCreateModalOpen(true);
                            }}
                            className="w-full"
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
                                    console.log('[GraphManagerPage] Graph card clicked:', graph);
                                    try {
                                        // First set the selected graph ID to show the modal
                                        dispatch(setSelectedGraph(graph.id));

                                        // Then fetch the complete graph data
                                        const accessToken = localStorage.getItem('access_token');
                                        if (!accessToken) {
                                            throw new Error('No access token found');
                                        }

                                        const response = await fetch(`/api/graphs/${graph.id}`, {
                                            headers: {
                                                'Authorization': `Bearer ${accessToken}`,
                                                'Content-Type': 'application/json'
                                            }
                                        });

                                        if (!response.ok) {
                                            throw new Error('Failed to fetch graph data');
                                        }

                                        const completeGraphData = await response.json();
                                        console.log('[GraphManagerPage][Click Handler Debug] completeGraphData:', completeGraphData);
                                        dispatch(setCurrentGraph(completeGraphData));
                                        console.log('[GraphManagerPage][Click Handler Debug] setCurrentGraph dispatched');
                                    } catch (error) {
                                        console.error('[GraphManagerPage] Error fetching graph data:', error);
                                        alert('Failed to load graph data. Please try again.');
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
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                                </div>
                                {/* Content overlay */}
                                <div className="relative z-20 p-4 h-full flex flex-col justify-end">
                                    <h3 className="text-xl font-bold text-white mb-2">{graph.graph_name}</h3>
                                    <p className="text-sm text-gray-200">
                                        Last updated: {new Date(graph.updated_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full text-center text-gray-500">
                            No graphs created yet
                        </div>
                    )}
                </div>
            </div>

            {/* Graph Details Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                        {currentGraph && currentGraph.id === selected ? (
                            <>
                                <h2 className="text-2xl font-bold mb-6 text-black">{currentGraph.graph_name}</h2>
                                <div className="flex gap-4 mb-6">
                                    <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                        <div className="text-gray-600 text-xs mb-1">Nodes</div>
                                        <div className="text-xl font-bold text-black">{currentGraph.graph_data?.nodes?.length || 0}</div>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                        <div className="text-gray-600 text-xs mb-1">Connections</div>
                                        <div className="text-xl font-bold text-black">{currentGraph.graph_data?.edges?.length || 0}</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 mb-6">
                                    <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                        <div className="text-gray-600 text-xs mb-1">Evidence</div>
                                        <div className="text-xl font-bold text-black">{currentGraph.graph_data?.evidence?.length || 0}</div>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                        <div className="text-gray-600 text-xs mb-1">Supporting Documents</div>
                                        <div className="text-xl font-bold text-black">{supportingDocCount !== null ? supportingDocCount : "Loading..."}</div>
                                    </div>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-4 mb-2">
                                    <div className="text-gray-600 text-xs mb-1">Created On</div>
                                    <div className="text-black">{currentGraph.created_at ? new Date(currentGraph.created_at).toLocaleString() : 'N/A'}</div>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                                    <div className="text-gray-600 text-xs mb-1">Last Modified</div>
                                    <div className="text-black">{currentGraph.updated_at ? new Date(currentGraph.updated_at).toLocaleString() : 'N/A'}</div>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => dispatch(setSelectedGraph(null))}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push(`/graph-editor?id=${currentGraph.id}`);
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Edit Graph
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[200px]">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
                                <div>Loading graph details...</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create New Graph Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6 text-black">Create New Graph</h2>
                        <input
                            type="text"
                            value={newGraphName}
                            onChange={(e) => setNewGraphName(e.target.value)}
                            placeholder="Enter graph name"
                            className="w-full p-2 border border-gray-300 rounded mb-4 text-black"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                className="bg-gray-200 px-4 py-2 rounded text-black"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <ContinueButton
                                onClick={async () => {
                                    console.log('[GraphModal] Create button clicked');
                                    if (userEmail) {
                                        try {
                                            console.log('Starting graph creation with name:', newGraphName || "Untitled Graph");
                                            const result = await dispatch(createGraph({
                                                name: newGraphName || "Untitled Graph",
                                                email: userEmail
                                            }) as any);

                                            console.log('Graph creation result:', result);

                                            if (result.payload?.id) {
                                                console.log('Graph created successfully with ID:', result.payload.id);
                                                console.log('Setting current graph in store:', result.payload);
                                                dispatch(setCurrentGraph(result.payload));
                                                console.log('Navigating to graph editor...');
                                                router.push(`/graph-editor?id=${result.payload.id}`);
                                            } else {
                                                console.error('No graph ID returned from creation:', result);
                                                alert('Failed to create graph. Please try again.');
                                            }
                                        } catch (error) {
                                            console.error('Error creating graph:', error);
                                            alert('Failed to create graph. Please try again.');
                                        }
                                    }
                                    setIsCreateModalOpen(false);
                                }}
                                className="w-auto px-6"
                            >
                                Create
                            </ContinueButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}