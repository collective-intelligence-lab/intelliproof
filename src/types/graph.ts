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
        padding: '4px 8px',
        margin: 0,
        borderRadius: 0,
        border: '1px solid #181A1B',
        backgroundColor: type === 'factual'
            ? '#556B2F66' // olive green with 40% opacity
            : type === 'value'
                ? '#1B365D66' // navy blue with 40% opacity
                : '#4B505566', // grey with 40% opacity
        color: '#000000',
        fontFamily: 'Josefin Sans, Century Gothic, sans-serif',
        fontSize: '14px',
        transition: 'all 200ms ease-out',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 24,
        maxWidth: 200,
        lineHeight: 1.2,
        width: 'auto',
        boxSizing: 'border-box',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word'
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
        style?: React.CSSProperties;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        weight: number;
    }>;
}; 