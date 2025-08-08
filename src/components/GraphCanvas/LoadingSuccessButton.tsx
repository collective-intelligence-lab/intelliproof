import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface LoadingSuccessButtonProps {
    onClick: () => Promise<void>;
    icon: React.ComponentType<any>;
    title: string;
    loadingText: string;
    successText: string;
    className?: string;
    disabled?: boolean;
    showLoadingImmediately?: boolean;
}

export interface LoadingSuccessButtonRef {
    startLoading: () => void;
    setSuccess: (success: boolean) => void;
}

const LoadingSuccessButton = forwardRef<LoadingSuccessButtonRef, LoadingSuccessButtonProps>(({
    onClick,
    icon: Icon,
    title,
    loadingText,
    successText,
    className = "",
    disabled = false,
    showLoadingImmediately = true
}, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useImperativeHandle(ref, () => ({
        startLoading: () => setIsLoading(true),
        setSuccess: (success: boolean) => {
            setIsLoading(false);
            if (success) {
                setIsSuccess(true);
                // Reset success state after 6 seconds
                setTimeout(() => {
                    setIsSuccess(false);
                }, 6000);
            }
        }
    }));

    const handleClick = async () => {
        if (isLoading || isSuccess || disabled) return;

        if (showLoadingImmediately) {
            setIsLoading(true);
        }

        try {
            await onClick();
            setIsLoading(false);
            setIsSuccess(true);

            // Reset success state after 6 seconds
            setTimeout(() => {
                setIsSuccess(false);
            }, 6000);
        } catch (error) {
            console.error('Operation failed:', error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading || isSuccess || disabled}
            className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${isLoading
                ? "bg-blue-100 text-blue-600 cursor-not-allowed"
                : isSuccess
                    ? "bg-green-100 text-green-600 cursor-not-allowed"
                    : "text-[#232F3E] hover:bg-gray-100 hover:scale-105 active:scale-95"
                } ${className}`}
            title={isLoading ? loadingText : isSuccess ? successText : title}
        >
            {isLoading ? (
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-xs">{loadingText}</span>
                </div>
            ) : isSuccess ? (
                <div className="flex items-center space-x-2">
                    <CheckIcon className="w-6 h-6" />
                    <span className="text-xs">{successText}</span>
                </div>
            ) : (
                <Icon className="w-7 h-7" strokeWidth={2} />
            )}
        </button>
    );
});

export default LoadingSuccessButton;
