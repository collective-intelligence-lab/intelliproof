"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Navbar from "../../components/Navbar";
import MainLayout from "../../components/Layout/MainLayout";
import { setCurrentGraph } from "../../store/slices/graphsSlice";
import { fetchUserData } from "../../store/slices/userSlice";
import type { RootState } from "../../store";

function GraphEditorContent() {
  const [isNavbarOpen, setNavbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const graphId = searchParams?.get('id');
  const graphs = useSelector((state: RootState) => state.graphs.items);
  const currentGraph = useSelector((state: RootState) => state.graphs.currentGraph);
  const { profile } = useSelector((state: RootState) => state.user);

  // Fetch user data when component mounts
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      console.log('[GraphEditor] No access token found, redirecting to signin');
      router.push('/signin');
      return;
    }
    dispatch(fetchUserData(accessToken) as any);
  }, [dispatch, router]);

  // Load graph data when graphId changes
  useEffect(() => {
    if (!graphId || graphId === 'undefined') {
      console.error('[GraphEditor] No valid graph ID provided in URL');
      setError('No valid graph ID provided. Please select a graph from the graph manager.');
      setIsLoading(false);
      router.push('/graph-manager');
      return;
    }

    console.log('[GraphEditor] Loading graph with ID:', graphId);
    const graph = graphs.find(g => g.id === graphId);
    if (graph && graph.graph_data) {
      console.log('[GraphEditor] Found complete graph in store:', graph);
      dispatch(setCurrentGraph(graph));
      setIsLoading(false);
    } else {
      console.log('[GraphEditor] Graph not found in store or incomplete, attempting to fetch...');
      // If graph not found in store or incomplete, try to fetch it
      const fetchGraph = async () => {
        try {
          const accessToken = localStorage.getItem('access_token');
          if (!accessToken) {
            console.error('[GraphEditor] No access token found');
            setError('Authentication required. Please sign in again.');
            setIsLoading(false);
            router.push('/signin');
            return;
          }

          console.log('[GraphEditor] Fetching graph from API...');
          const response = await fetch(`/api/graphs/${graphId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 404) {
              throw new Error('Graph not found. It may have been deleted.');
            } else if (response.status === 401) {
              throw new Error('Authentication required. Please sign in again.');
            } else {
              throw new Error(errorData.error || `Failed to fetch graph: ${response.statusText}`);
            }
          }

          const data = await response.json();
          console.log('[GraphEditor] Successfully fetched graph data:', data);
          dispatch(setCurrentGraph(data));
          setIsLoading(false);
        } catch (error) {
          console.error('[GraphEditor] Error fetching graph:', error);
          setError(error instanceof Error ? error.message : 'Failed to load graph');
          setIsLoading(false);
          router.push('/graph-manager');
        }
      };
      fetchGraph();
    }
  }, [graphId, graphs, dispatch, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header onMenuClick={() => setNavbarOpen(true)} />
        <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header onMenuClick={() => setNavbarOpen(true)} />
        <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p className="text-xl font-bold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => router.push('/graph-manager')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Graph Manager
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onMenuClick={() => setNavbarOpen(true)} />
      <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
      <div className="flex-1">
        <MainLayout />
      </div>
    </div>
  );
}

export default function GraphEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    }>
      <GraphEditorContent />
    </Suspense>
  );
}
