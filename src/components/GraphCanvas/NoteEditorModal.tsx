import React, { useEffect, useState } from 'react';
import type { Note } from './NotesManagerModal';
import AudioRecorder from '../AudioRecorder';

interface Props {
    open: boolean;
    onClose: () => void;
    initialNote?: Note | null;
    onSave: (payload: { title: string; text: string; url?: string }) => Promise<void> | void;
}

export default function NoteEditorModal({ open, onClose, initialNote, onSave }: Props) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(initialNote?.title || '');
            setText(initialNote?.text || '');
            setUrl(initialNote?.url || '');
        }
    }, [initialNote, open]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({ title, text, url: url || undefined });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8 relative" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <h2 className="text-2xl font-bold mb-2 text-black">{initialNote ? 'Edit Note' : 'New Note'}</h2>
                <p className="text-black text-lg mb-6 font-normal">{initialNote ? 'Update the note' : 'Create a new note'}</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <label className="text-black text-base font-medium" htmlFor="note-title">Title</label>
                        <div className="relative">
                            <input
                                id="note-title"
                                type="text"
                                className="w-full px-4 py-2 pr-12 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                style={{ color: '#000000', fontWeight: 500 }}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note title"
                                required
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AudioRecorder
                                    onTranscription={(transcribedText) => {
                                        // Set transcribed text as the note title
                                        setTitle(transcribedText);
                                    }}
                                    onError={(error) => {
                                        console.error('Audio transcription error:', error);
                                        // You could add a toast notification here
                                    }}
                                    className="p-1.5"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <label className="text-black text-base font-medium" htmlFor="note-link">Optional Link</label>
                        <input
                            id="note-link"
                            type="url"
                            className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ color: '#000000', fontWeight: 500 }}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <label className="text-black text-base font-medium" htmlFor="note-text">Text</label>
                        <div className="relative">
                            <textarea
                                id="note-text"
                                className="w-full px-4 py-2 pr-12 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[220px]"
                                style={{ color: '#000000', fontWeight: 500 }}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Write your note here..."
                                required
                            />
                            <div className="absolute right-2 top-2">
                                <AudioRecorder
                                    onTranscription={(transcribedText) => {
                                        // Append transcribed text to existing note text
                                        const newText = text ? `${text} ${transcribedText}` : transcribedText;
                                        setText(newText);
                                    }}
                                    onError={(error) => {
                                        console.error('Audio transcription error:', error);
                                        // You could add a toast notification here
                                    }}
                                    className="p-1.5"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-end">
                        <button type="button" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-[#232F3E] text-white rounded-md hover:bg-[#1A2330] transition-colors font-medium" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


