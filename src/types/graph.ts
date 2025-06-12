import type { Node } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

export type ClaimType = 'factual' | 'value' | 'policy';

export interface ClaimData {
    text: string;
    type: ClaimType;
    author?: string;
    belief?: number;
    created_on?: string;
    onChange?: (newText: string) => void;
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
        width: 200,
        minHeight: 80,
        padding: 16,
        borderRadius: 8,
        border: '1px solid #000000',
        backgroundColor: type === 'factual'
            ? 'hsl(168, 65%, 75%)'  // Lighter, softer teal for better contrast
            : type === 'value'
                ? 'hsl(228, 65%, 80%)'  // Lighter, softer indigo for better contrast
                : 'hsl(48, 65%, 85%)', // Very light yellow for better contrast
        color: '#1A1A1A', // Very dark grey for better readability
        fontFamily: 'Josefin Sans, Century Gothic, sans-serif',
        fontSize: '14px',
        transition: 'all 200ms ease-out',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
    }
}); 