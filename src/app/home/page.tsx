"use client";

import React, { useState } from 'react';
import AnimatedText from '../../components/AnimatedText';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import Services from '../../components/Services';

// Placeholder Team component
const Team = () => <div style={{ background: '#FAFAFA', fontFamily: 'Josefin Sans, sans-serif' }} className="p-8 rounded-xl text-center">Team Section goes here</div>;

export default function HomePage() {
    const [selectedTab] = useState('home');
    const [isNavbarOpen, setNavbarOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
            <Header onMenuClick={() => setNavbarOpen(true)} />
            <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
            {selectedTab === "home" && (
                <div className="flex-1 flex flex-col">
                    <div className="p-8">
                        <AnimatedText />
                    </div>
                    <div className="px-8 pb-8">
                        <Services />
                    </div>
                    <div className="px-8 pb-8">
                        <Team />
                    </div>
                </div>
            )}
        </div>
    );
} 