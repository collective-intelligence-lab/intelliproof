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

// Placeholder for GraphCard and GraphModal components

// Define a type for Graph
interface Graph {
    id: string;
    graph_name: string;
    owner_email: string;
    created_at: string;
    updated_at: string;
    graph_data?: {
        nodes: any[];
        edges: any[];
    };
    new?: boolean;
}

export default function GraphManagerPage() {
    const dispatch = useDispatch();
    const graphs = useSelector((state: RootState) => state.graphs.items as Graph[]);
    const selected = useSelector((state: RootState) => state.graphs.selected as Graph | null);
    const loading = useSelector((state: RootState) => state.graphs.loading);
    const error = useSelector((state: RootState) => state.graphs.error);
    const userEmail = useSelector((state: RootState) => state.user.profile?.email);
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGraphName, setNewGraphName] = useState("");
    const [isNavbarOpen, setNavbarOpen] = useState(false);

    useEffect(() => {
        if (userEmail) {
            console.log('[GraphManagerPage] Loading graphs for:', userEmail);
            dispatch(loadGraphs(userEmail) as any);
        }
    }, [dispatch, userEmail]);

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
                    <ContinueButton
                        onClick={() => {
                            console.log('[GraphManagerPage] New Graph button clicked');
                            setIsCreateModalOpen(true);
                        }}
                        className="w-auto px-6"
                    >
                        New Graph
                    </ContinueButton>
                </div>
                <div className="flex flex-wrap gap-6">
                    {graphs && graphs.length > 0 ? (
                        graphs.map((graph) => (
                            <div
                                key={graph.id}
                                className="relative w-80 h-56 rounded-xl shadow-lg cursor-pointer overflow-hidden group"
                                onClick={() => {
                                    console.log('[GraphManagerPage] Graph card clicked:', graph);
                                    dispatch(setSelectedGraph(graph));
                                }}
                            >
                                {/* Background image */}
                                <div className="absolute inset-0 z-0">
                                    <Image src="/graphIcon.png" alt="Graph Icon" fill style={{ objectFit: 'fill' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                                </div>
                                {/* Content overlay */}
                                <div className="relative z-20 p-4 h-full flex flex-col justify-end">
                                    <h3 className="text-xl font-bold text-white mb-2">{graph.graph_name}</h3>
                                    <p className="text-sm text-gray-200">
                                        Last updated: {new Date(graph.updated_at).toLocaleDateString()}
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
                        <h2 className="text-2xl font-bold mb-6 text-black">{selected.graph_name}</h2>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                <div className="text-gray-600 text-xs mb-1">Nodes</div>
                                <div className="text-xl font-bold text-black">{selected.graph_data?.nodes?.length || 0}</div>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-lg p-4">
                                <div className="text-gray-600 text-xs mb-1">Connections</div>
                                <div className="text-xl font-bold text-black">{selected.graph_data?.edges?.length || 0}</div>
                            </div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 mb-2">
                            <div className="text-gray-600 text-xs mb-1">Created On</div>
                            <div className="text-black text-sm">{new Date(selected.created_at).toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 mb-2">
                            <div className="text-gray-600 text-xs mb-1">Last Modified</div>
                            <div className="text-black text-sm">{new Date(selected.updated_at).toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 mb-6">
                            <div className="text-gray-600 text-xs mb-1">Created By</div>
                            <div className="text-black text-sm">{selected.owner_email}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 justify-center">
                            <button
                                className="bg-gray-200 px-6 h-12 w-auto rounded text-black"
                                onClick={() => dispatch(setSelectedGraph(null))}
                            >
                                Cancel
                            </button>
                            <button
                                className="bg-red-600 px-6 h-12 w-auto rounded text-white"
                                onClick={async () => {
                                    console.log('[GraphModal] Delete button clicked:', selected.id);
                                    await dispatch((await import('../../store/slices/graphsSlice')).deleteGraph(selected.id) as any);
                                    dispatch(setSelectedGraph(null));
                                }}
                            >
                                Delete
                            </button>
                            <ContinueButton
                                onClick={() => {
                                    console.log('[GraphModal] Open button clicked:', selected.id);
                                    dispatch(setSelectedGraph(null));
                                    window.location.href = `/graph-editor?id=${selected.id}`;
                                }}
                                className="w-auto px-6 h-12"
                            >
                                Open
                            </ContinueButton>
                        </div>
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
                                            const result = await dispatch(createGraph({
                                                name: newGraphName || "Untitled Graph",
                                                email: userEmail
                                            }) as any);

                                            console.log('Graph creation result:', result);

                                            if (result.payload?.id) {
                                                dispatch(setCurrentGraph(result.payload));
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