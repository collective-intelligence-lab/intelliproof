import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface ImagePreviewerHandle {
    // Placeholder for future methods (e.g., getSelectedRegion)
}

interface ImagePreviewerProps {
    url: string;
    fixedWidth?: number;
}

const ImagePreviewer = forwardRef<ImagePreviewerHandle, ImagePreviewerProps>(({ url, fixedWidth }, ref) => {
    const [zoom, setZoom] = useState<number>(1);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Expose future methods to parent
    useImperativeHandle(ref, () => ({}), []);

    // Pan logic
    const panBy = (dx: number, dy: number) => {
        if (viewerRef.current) {
            viewerRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
        }
    };

    return (
        <div>
            <div
                ref={viewerRef}
                style={{
                    height: 450,
                    overflow: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 8,
                    background: '#fff',
                    width: fixedWidth || 400,
                    minWidth: fixedWidth || 400,
                    maxWidth: fixedWidth || 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {(() => { console.log('[ImagePreviewer] Rendering image with URL:', url); return null; })()}
                <img
                    src={url}
                    alt="preview"
                    style={{
                        width: `calc(100% * ${zoom})`,
                        height: 'auto',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        display: 'block',
                        margin: '0 auto',
                        userSelect: 'none',
                    }}
                    draggable={false}
                    onError={(e) => {
                        console.error('[ImagePreviewer] Failed to load image:', url, e);
                    }}
                />
            </div>
            {/* Zoom Controls */}
            <div className="flex items-center justify-between mt-2 mb-2 gap-2">
                <button
                    type="button"
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    onClick={() => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))}
                    disabled={zoom <= 0.2}
                >
                    -
                </button>
                <span className="text-xs text-gray-600">Zoom: {(zoom * 100).toFixed(0)}%</span>
                <button
                    type="button"
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
                    disabled={zoom >= 3}
                >
                    +
                </button>
            </div>
            {/* Pan Controls (up arrow above, then left, down, right) */}
            <div className="flex flex-col items-center mb-2">
                <div className="flex justify-center mb-1">
                    <button
                        type="button"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                        onClick={() => panBy(0, -50)}
                    >
                        ↑
                    </button>
                </div>
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                        onClick={() => panBy(-50, 0)}
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                        onClick={() => panBy(0, 50)}
                    >
                        ↓
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                        onClick={() => panBy(50, 0)}
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ImagePreviewer; 