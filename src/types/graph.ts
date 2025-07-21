import type { Node } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

export type ClaimType = 'factual' | 'value' | 'policy';

export type Evidence = {
    id: string;
    title: string;
    supportingDocId: string;
    supportingDocName: string;
    excerpt: string;
    confidence: number; // [0,1], user-specified, default 0.5
};

export interface ClaimData {
    text: string;
    type: ClaimType;
    author?: string;
    belief?: number;
    created_on?: string;
    onChange?: (newText: string) => void;
    evidenceIds?: string[];
    onEvidenceDrop?: (evidenceId: string) => void;
}

export interface ClaimNode extends Node<ClaimData> {
    id: string;
    type: 'default';
    position: { x: number; y: number };
    data: ClaimData;
    style?: React.CSSProperties;
}

export const createClaimNode = (
    text: string = "new node",
    type: ClaimType = 'factual',
    mousePosition?: { x: number; y: number }
): ClaimNode => {
    const getColors = (nodeType: string) => {
        switch (nodeType) {
            case "factual":
                return {
                    background: "#eeeeee",
                    header: "#aeaeae"
                };
            case "value":
                return {
                    background: "#F2F4E8",  // Very light olive green
                    header: "#B2B4A8"  // Darker olive green
                };
            case "policy":
                return {
                    background: "#F0F3F9",  // Very light navy blue
                    header: "#B0B3B9"  // Darker navy blue with similar contrast
                };
            default:
                return {
                    background: "#eeeeee",
                    header: "#aeaeae"
                };
        }
    };

    const colors = getColors(type);

    return {
        id: uuidv4(),
        type: 'default',
        position: mousePosition
            ? {
                x: mousePosition.x + 200,
                y: mousePosition.y + (Math.random() - 0.5) * 50
            }
            : {
                x: window.innerWidth / 3,
                y: window.innerHeight / 2 + (Math.random() - 0.5) * 50
            },
        data: {
            text,
            type,
        },
        style: {
            backgroundColor: colors.background,
            color: "#000000",
            border: "none",
            borderRadius: "3px",
            padding: "4px 12px",
            fontFamily: "Arial, sans-serif",
            fontSize: "7px",  // Ensure font size is 10px
            cursor: "pointer",
            minWidth: "100px",
            maxWidth: "200px",
            width: "fit-content",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center" as const,
            transition: "all 200ms ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)"
        }
    };
};

export type ExportedGraphData = {
    evidence: Evidence[];
    nodes: Array<{
        id: string;
        text: string;
        type: ClaimType;
        author: string | undefined;
        belief: number;
        position: { x: number; y: number };
        created_on: string;
        evidenceIds: string[];
        style?: React.CSSProperties;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        weight: number;
    }>;
}; 