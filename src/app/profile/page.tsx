'use client';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { fetchUserData } from '../../store/slices/userSlice';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';

interface Graph {
    id: string;
    graph_data: any;
    created_at: string;
    updated_at: string;
    graph_name: string;
}

export default function ProfilePage() {
    const [isNavbarOpen, setNavbarOpen] = useState(false);
    const [supportingDocCounts, setSupportingDocCounts] = useState<{ [graphId: string]: number | null }>({});
    const dispatch = useDispatch();
    const { profile, graphs, loading, error } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        console.log('Profile page mounted');
        // Get the access token from localStorage
        const accessToken = localStorage.getItem('access_token');
        console.log('Access token:', accessToken ? 'Present' : 'Not found');

        if (accessToken) {
            console.log('Dispatching fetchUserData');
            dispatch(fetchUserData(accessToken) as any);
        }
    }, [dispatch]);

    // Fetch supporting document counts for all graphs
    useEffect(() => {
        if (graphs && graphs.length > 0) {
            graphs.forEach((graph: Graph) => {
                fetch(`/api/supporting-documents/count?graph_id=${graph.id}`)
                    .then(res => res.json())
                    .then(data => {
                        setSupportingDocCounts(prev => ({ ...prev, [graph.id]: typeof data.count === 'number' ? data.count : null }));
                    })
                    .catch(() => {
                        setSupportingDocCounts(prev => ({ ...prev, [graph.id]: null }));
                    });
            });
        }
    }, [graphs]);

    // Add effect to log state changes
    useEffect(() => {
        console.log('State updated:', { profile, graphs, loading, error });
    }, [profile, graphs, loading, error]);

    if (loading) {
        console.log('Loading state active');
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Header onMenuClick={() => setNavbarOpen(true)} />
                <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
                <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    if (error) {
        console.log('Error state:', error);
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Header onMenuClick={() => setNavbarOpen(true)} />
                <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
                <div className="flex items-center justify-center flex-1 text-red-500">
                    {error}
                </div>
            </div>
        );
    }

    console.log('Rendering profile page with data:', { profile, graphs });
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header onMenuClick={() => setNavbarOpen(true)} />
            <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />

            <div className="flex-1 p-8">
                {profile && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white shadow rounded-lg p-6 mb-8">
                            <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-600">First Name</p>
                                    <p className="font-semibold">{profile.first_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Last Name</p>
                                    <p className="font-semibold">{profile.last_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Email</p>
                                    <p className="font-semibold">{profile.email}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Account Type</p>
                                    <p className="font-semibold capitalize">{profile.account_type}</p>
                                </div>
                                {profile.country && (
                                    <div>
                                        <p className="text-gray-600">Country</p>
                                        <p className="font-semibold">{profile.country}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-600">Member Since</p>
                                    <p className="font-semibold">
                                        {new Date(profile.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4">Your Graphs</h2>
                            {graphs.length === 0 ? (
                                <p className="text-gray-500">No graphs created yet</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                    {graphs.map((graph: Graph) => (
                                        <div key={graph.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                                            <h3 className="font-semibold mb-2 text-lg">{graph.graph_name}</h3>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-600">Nodes</div>
                                                    <div className="font-bold text-black">{graph.graph_data?.nodes?.length || 0}</div>
                                                </div>
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-600">Connections</div>
                                                    <div className="font-bold text-black">{graph.graph_data?.edges?.length || 0}</div>
                                                </div>
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-600">Evidence</div>
                                                    <div className="font-bold text-black">{graph.graph_data?.evidence?.length || 0}</div>
                                                </div>
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-600">Supporting Documents</div>
                                                    <div className="font-bold text-black">{supportingDocCounts[graph.id] !== undefined && supportingDocCounts[graph.id] !== null ? supportingDocCounts[graph.id] : 'Loading...'}</div>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded p-2 mb-1">
                                                <div className="text-xs text-gray-600">Created On</div>
                                                <div className="text-black text-sm">{new Date(graph.created_at).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded p-2">
                                                <div className="text-xs text-gray-600">Last Modified</div>
                                                <div className="text-black text-sm">{new Date(graph.updated_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 