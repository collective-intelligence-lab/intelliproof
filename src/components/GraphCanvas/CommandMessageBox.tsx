import React from 'react';

interface CommandMessageBoxProps {
    title: string;
    content: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}

const CommandMessageBox: React.FC<CommandMessageBoxProps> = ({ title, content, icon, onClick, disabled }) => {
    return (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5 shadow-sm">
            <div className="flex flex-col">
                <span className="font-bold text-xs text-gray-900">{title}</span>
                <span className="text-xs text-gray-700 mt-0.5 leading-tight">{content}</span>
            </div>
            <button
                onClick={onClick}
                disabled={disabled}
                className={`ml-3 p-1.5 rounded-full transition-colors ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-blue-600'}`}
                title={title}
                aria-label={title}
            >
                {icon}
            </button>
        </div>
    );
};

export default CommandMessageBox; 