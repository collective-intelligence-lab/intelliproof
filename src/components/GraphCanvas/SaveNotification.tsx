import React, { useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SaveNotificationProps {
  isVisible: boolean;
  isSaving: boolean;
  isSuccess: boolean;
  message: string;
  onClose: () => void;
}

const SaveNotification: React.FC<SaveNotificationProps> = ({
  isVisible,
  isSaving,
  isSuccess,
  message,
  onClose
}) => {
  useEffect(() => {
    if (isVisible && !isSaving) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isSaving, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 px-6 py-4 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center space-x-3">
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-medium text-gray-900">Saving...</div>
              <div className="text-sm text-gray-600">{message}</div>
            </div>
          </>
        ) : isSuccess ? (
          <>
            <CheckIcon className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">Saved Successfully</div>
              <div className="text-sm text-gray-600">{message}</div>
            </div>
          </>
        ) : (
          <>
            <XMarkIcon className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-medium text-gray-900">Save Failed</div>
              <div className="text-sm text-gray-600">{message}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SaveNotification;
