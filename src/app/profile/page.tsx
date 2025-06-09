'use client';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
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
    const dispatch = useDispatch();
    const { profile, graphs, loading, error } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        console.log('Profile page mounted');
        // Get the access token from localStorage
        const accessToken = localStorage.getItem('access_token');
        console.log('Access token:', accessToken ? 'Present' : 'Not found');

        if (accessToken) {
            console.log('Dispatching fetchUserData');
            dispatch(fetchUserData(accessToken));
        }
    }, [dispatch]);

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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {graphs.map((graph: Graph) => (
                                        <div key={graph.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow w-96">
                                            <h3 className="font-semibold mb-2">{graph.graph_name}</h3>
                                            <p className="text-sm text-gray-500">
                                                Created: {new Date(graph.created_at).toLocaleString()}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Last Updated: {new Date(graph.updated_at).toLocaleString()}
                                            </p>
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