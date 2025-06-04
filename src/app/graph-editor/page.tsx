'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';

export default function GraphEditorPage() {
    const [isNavbarOpen, setNavbarOpen] = useState(false);
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header userName="Anesu Gavhera" onMenuClick={() => setNavbarOpen(true)} />
            <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
            <div className="flex items-center justify-center flex-1 text-3xl">Graph Editor</div>
        </div>
    );
} 