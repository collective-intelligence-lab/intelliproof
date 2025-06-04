import type { Node } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

export type ClaimType = 'factual' | 'value' | 'policy';

export interface ClaimData {
    text: string;
    type: ClaimType;
}

export interface ClaimNode extends Node<ClaimData> {
    id: string;
    type: 'default';
    position: { x: number; y: number };
    data: ClaimData;
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
            x: mousePosition.x + (Math.random() - 0.5) * 100,
            y: mousePosition.y + (Math.random() - 0.5) * 100
        }
        : { 
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 100
        },
    data: {
        text,
        type
    },
    style: {
        width: 200,
        padding: 16,
        borderRadius: 8,
        border: '1px solid #000000',
        backgroundColor: type === 'factual' 
            ? '#4FD9BD'  // Teal
            : type === 'value' 
                ? '#7283D9'  // Indigo
                : '#FDD000', // Yellow
        color: '#000000',
        fontFamily: 'Josefin Sans, Century Gothic, sans-serif',
        fontSize: '14px',
        transition: 'all 200ms ease-out'
    }
}); 