import React from 'react';

export interface Note {
    id: string;
    graph_id: string;
    owner_email?: string;
    title: string;
    text: string;
    url?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    notes: Note[];
    onCreate: () => void;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
}

const MAX_PREVIEW = 140;

export default function NotesManagerModal({ open, onClose, notes, onCreate, onEdit, onDelete }: Props) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <h2 className="text-2xl font-bold mb-2 text-black">Notes</h2>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-black text-lg font-normal m-0">Manage notes for this graph</p>
                    <button
                        className="px-3 py-1.5 bg-[#232F3E] text-[#F3F4F6] rounded-md hover:bg-[#1A2330] transition-colors text-sm cursor-pointer font-[DM Sans] font-normal"
                        onClick={onCreate}
                        type="button"
                    >
                        + Add Note
                    </button>
                </div>

                {notes.length === 0 ? (
                    <div className="p-4 bg-[#FAFAFA] rounded-md border border-gray-300 text-center text-gray-500 text-sm font-medium">
                        No notes yet. Create your first note.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {notes.map((n) => (
                            <div key={n.id} className="p-4 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base font-semibold">{n.title}</div>
                                        {n.url && (
                                            <a className="text-xs text-blue-600 underline" href={n.url} target="_blank" rel="noopener noreferrer">Open link</a>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1 font-normal whitespace-pre-line">
                                            {n.text.length > MAX_PREVIEW ? n.text.slice(0, MAX_PREVIEW) + '…' : n.text}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-xs"
                                        onClick={() => onEdit(n)}
                                        type="button"
                                    >
                                        Open
                                    </button>
                                    <button
                                        className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-xs"
                                        onClick={() => onDelete(n.id)}
                                        type="button"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-4 justify-end mt-6">
                    <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}


