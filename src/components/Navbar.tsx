import React from 'react';
import Link from 'next/link';

interface NavbarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navOptions = [
    { label: 'Home', href: '/home' },
    { label: 'Profile', href: '/profile' },
    { label: 'Graph Editor', href: '/graph-editor' },
];

const Navbar: React.FC<NavbarProps> = ({ isOpen, onClose }) => (
    <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ fontFamily: 'Arial, sans-serif' }}
    >
        <button
            onClick={onClose}
            className="absolute top-8 right-10 text-white text-4xl focus:outline-none"
            aria-label="Close menu"
        >
            &times;
        </button>
        <nav className="flex flex-col gap-8 text-3xl text-white">
            {navOptions.map(option => (
                <Link key={option.href} href={option.href} onClick={onClose} className="hover:underline">
                    {option.label}
                </Link>
            ))}
        </nav>
    </div>
);

export default Navbar; 