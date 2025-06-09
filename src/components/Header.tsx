"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserName } from '../hooks/useUserName';
import Image from 'next/image';
import Link from 'next/link';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const router = useRouter();
    const userName = useUserName();

    const handleSignOut = async () => {
        try {
            // Get the access token from localStorage
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error("No active session found");
            }

            const response = await fetch("http://localhost:8000/api/signout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
            });

            if (!response.ok) {
                throw new Error("Failed to sign out");
            }

            // Clear all session data from localStorage
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_data');

            // Redirect to signin page
            router.push("/signin");
        } catch (error) {
            console.error("Error signing out:", error);
            // Even if there's an error, try to clear the session and redirect
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_data');
            router.push("/signin");
        }
    };

    return (
        <header className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-black via-[#FAFAFA] to-black text-white" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
            <div className="flex items-center gap-4">
                <Link href="/graph-manager" className="cursor-pointer">
                    <Image src="/logo.png" alt="Intelliproof Logo" width={40} height={40} />
                </Link>
                <Link href="/home" className="font-bold text-lg hover:text-gray-300 transition-colors duration-200">
                    Intelliproof
                </Link>
            </div>
            <div className="flex items-center gap-4">
                {userName && (
                    <Link href="/profile" className="font-bold text-lg hover:text-gray-300 transition-colors duration-200">
                        {userName}
                    </Link>
                )}
                <div className="relative group">
                    <button onClick={onMenuClick} aria-label="Open menu" className="focus:outline-none w-8 h-8 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className="absolute right-0 mt-2 w-32 bg-black text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Navigation Menu
                    </div>
                </div>
                <div className="relative group">
                    <button
                        onClick={handleSignOut}
                        className="focus:outline-none w-8 h-8 flex items-center justify-center"
                        aria-label="Logout"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                    <div className="absolute right-0 mt-2 w-20 bg-black text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Logout
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header; 