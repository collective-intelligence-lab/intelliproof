'use client';

import React from 'react';

type ContinueButtonProps = {
    children?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
    type?: "button" | "submit";
};

export default function ContinueButton({
    children = "Continue",
    loading = false,
    disabled = false,
    onClick,
    className = "",
    type = "button",
}: ContinueButtonProps) {
    return (
        <button
            type={type}
            className={`w-full py-3 rounded bg-[#7283d9] text-black font-semibold hover:bg-[#5f6fc0] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7283d9] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? "Saving..." : children}
        </button>
    );
} 