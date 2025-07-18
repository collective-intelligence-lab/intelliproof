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
    text: string = "New Claim",
    type: ClaimType = 'factual',
    mousePosition?: { x: number; y: number }
): ClaimNode => {
    const getColors = (nodeType: string) => {
        switch (nodeType) {
            case "factual":
                return {
                    background: "#F5FBF5",
                    header: "#D1E7D1"
                };
            case "value":
                return {
                    background: "#F5F8FF",
                    header: "#D1DBF7"
                };
            case "policy":
                return {
                    background: "#FFF5F5",
                    header: "#F7D1D1"
                };
            default:
                return {
                    background: "#F5FBF5",
                    header: "#D1E7D1"
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
            boxShadow: `
                0px 3.54px 4.55px 0px rgba(0, 0, 0, 0.05),
                0px 3.54px 4.55px 0px rgba(0, 0, 0, 0.13),
                0px 0.51px 1.01px 0px rgba(0, 0, 0, 0.2)
            `,
            border: `1px solid ${colors.header}`,
            borderRadius: "8px",
            padding: "0",
            fontFamily: "DM Sans, sans-serif",
            fontSize: "14px",
            cursor: "pointer",
            minWidth: "160px",
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center" as const,
            transition: "all 200ms ease"
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