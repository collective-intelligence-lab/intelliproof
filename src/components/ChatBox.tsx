import React from 'react';

interface ChatBoxProps {
    children: React.ReactNode;
    className?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ children, className = '' }) => {
    return (
        <div
            className={`bg-gray-100 rounded-xl shadow-md p-4 mb-4 flex flex-col max-w-lg w-full border border-gray-200 ${className}`}
            style={{ minWidth: 280 }}
        >
            {children}
        </div>
    );
};

export default ChatBox; 