"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Navbar from "../../components/Navbar";
import MainLayout from "../../components/Layout/MainLayout";
import { setCurrentGraph } from "../../store/slices/graphsSlice";
import { fetchUserData } from "../../store/slices/userSlice";
import type { RootState } from "../../store";

export default function GraphEditorPage() {
  const [isNavbarOpen, setNavbarOpen] = useState(false);
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const graphId = searchParams.get('id');
  const graphs = useSelector((state: RootState) => state.graphs.items);
  const currentGraph = useSelector((state: RootState) => state.graphs.currentGraph);
  const { profile } = useSelector((state: RootState) => state.user);

  // Fetch user data when component mounts
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      dispatch(fetchUserData(accessToken));
    }
  }, [dispatch]);

  // Load graph data when graphId changes
  useEffect(() => {
    if (graphId) {
      console.log('Loading graph with ID:', graphId); // Debug log
      const graph = graphs.find(g => g.id === graphId);
      if (graph) {
        console.log('Found graph:', graph); // Debug log
        dispatch(setCurrentGraph(graph));
      } else {
        console.warn('Graph not found in store:', graphId); // Debug log
        // If graph not found in store, try to fetch it
        const fetchGraph = async () => {
          try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
              console.error('No access token found');
              return;
            }

            const response = await fetch(`/api/graphs/${graphId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            if (response.ok) {
              const data = await response.json();
              console.log('Fetched graph data:', data); // Debug log
              dispatch(setCurrentGraph(data));
            } else {
              console.error('Failed to fetch graph:', response.statusText);
            }
          } catch (error) {
            console.error('Error fetching graph:', error);
          }
        };
        fetchGraph();
      }
    }
  }, [graphId, graphs, dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onMenuClick={() => setNavbarOpen(true)} />
      <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
      <div>
        <MainLayout />
      </div>
    </div>
  );
}
