import React, { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
    onTranscription: (text: string) => void;
    onError?: (error: string) => void;
    className?: string;
    disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
    onTranscription,
    onError,
    className = "",
    disabled = false
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        console.log('🎤 [AudioRecorder] Starting recording...');
        try {
            console.log('🎤 [AudioRecorder] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ [AudioRecorder] Microphone access granted');

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];
            console.log('✅ [AudioRecorder] MediaRecorder created');

            mediaRecorderRef.current.ondataavailable = (event) => {
                console.log('🎤 [AudioRecorder] Data available, size:', event.data.size);
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    console.log('✅ [AudioRecorder] Chunk added, total chunks:', chunksRef.current.length);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                console.log('🎤 [AudioRecorder] Recording stopped, processing...');
                setIsProcessing(true);
                try {
                    console.log('🎤 [AudioRecorder] Creating audio blob...');
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                    console.log('✅ [AudioRecorder] Audio blob created, size:', audioBlob.size);
                    console.log('🔍 [AudioRecorder] Blob type:', audioBlob.type);
                    await uploadAudio(audioBlob);
                } catch (error) {
                    console.error('❌ [AudioRecorder] Error processing audio:', error);
                    onError?.('Failed to process audio recording');
                } finally {
                    setIsProcessing(false);
                    console.log('🎤 [AudioRecorder] Stopping microphone tracks...');
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            console.log('🎤 [AudioRecorder] Starting MediaRecorder...');
            mediaRecorderRef.current.start();
            setIsRecording(true);
            console.log('✅ [AudioRecorder] Recording started successfully');
        } catch (error) {
            console.error('❌ [AudioRecorder] Error starting recording:', error);
            onError?.('Failed to access microphone. Please check permissions.');
        }
    }, [onError]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const uploadAudio = async (audioBlob: Blob) => {
        console.log('📤 [AudioRecorder] Starting audio upload...');
        console.log('🔍 [AudioRecorder] Audio blob details:', {
            size: audioBlob.size,
            type: audioBlob.type
        });

        try {
            console.log('📤 [AudioRecorder] Creating FormData...');
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'recording.wav');
            console.log('✅ [AudioRecorder] FormData created');

            console.log('📤 [AudioRecorder] Sending request to /api/audio/transcribe-file...');
            const response = await fetch('/api/audio/transcribe-file', {
                method: 'POST',
                body: formData,
            });
            console.log('🔍 [AudioRecorder] Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                console.log('❌ [AudioRecorder] Response not ok, getting error details...');
                const errorText = await response.text();
                console.log('❌ [AudioRecorder] Error response body:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            console.log('✅ [AudioRecorder] Response ok, parsing JSON...');
            const result = await response.json();
            console.log('🔍 [AudioRecorder] Parsed result:', result);

            if (result.success && result.text) {
                console.log('✅ [AudioRecorder] Transcription successful:', result.text);
                onTranscription(result.text);
            } else {
                console.log('❌ [AudioRecorder] Transcription failed:', result.error);
                onError?.(result.error || 'No speech detected');
            }
        } catch (error) {
            console.error('❌ [AudioRecorder] Error uploading audio:', error);
            console.error('❌ [AudioRecorder] Error details:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            onError?.('Failed to transcribe audio');
        }
    };

    const handleClick = () => {
        if (disabled) return;

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={`${className} transition-colors duration-200 ${isRecording
                ? 'text-red-500 hover:text-red-600'
                : 'text-black hover:text-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
        >
            {isProcessing ? (
                // Loading spinner
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : (
                // Microphone icon
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                </svg>
            )}
        </button>
    );
};

export default AudioRecorder;
