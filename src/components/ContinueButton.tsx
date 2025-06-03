import React from 'react';

interface ContinueButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    children: React.ReactNode;
}

export default function ContinueButton({ loading = false, children, className = "", ...props }: ContinueButtonProps) {
    return (
        <button
            {...props}
            className={`w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            disabled={loading || props.disabled}
        >
            {loading ? (
                <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                </div>
            ) : (
                children
            )}
        </button>
    );
} 