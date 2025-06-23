import type { Node } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

export type ClaimType = 'factual' | 'value' | 'policy';

export type Evidence = {
    id: string;
    title: string;
    supportingDocId: string;
    supportingDocName: string;
    excerpt: string;
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
): ClaimNode => ({
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
        padding: '4px 10px',
        borderRadius: 0,
        border: '2px solid #181A1B',
        backgroundColor: type === 'factual'
            ? '#38444D'
            : type === 'value'
                ? '#6B715C'
                : '#A3A7A9',
        color: '#F3F4F6',
        fontFamily: 'Josefin Sans, Century Gothic, sans-serif',
        fontSize: '14px',
        transition: 'all 200ms ease-out',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 28
    }
});

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
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        weight: number;
    }>;
}; 