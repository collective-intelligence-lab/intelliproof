import React, { useState } from "react";

interface Node {
    id: string;
    evidence?: number[];
    evidence_min?: number;
    evidence_max?: number;
}

interface Edge {
    source: string;
    target: string;
    weight: number;
}

interface GraphData {
    nodes: Node[];
    edges: Edge[];
    lambda?: number;
    epsilon?: number;
    max_iterations?: number;
    evidence_min?: number;
    evidence_max?: number;
}

interface ClaimCredibilityModalProps {
    open: boolean;
    onClose: () => void;
    graphData: GraphData;
}

const ClaimCredibilityModal: React.FC<ClaimCredibilityModalProps> = ({ open, onClose, graphData }) => {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleRun = async () => {
        setError("");
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch("/api/ai/get-claim-credibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(graphData),
            });

            if (!response.ok) {
                let errorMsg = "An error occurred.";
                try {
                    const errorData = await response.json();
                    if (response.status === 422 && errorData.detail) {
                        errorMsg = "You must send both 'nodes' and 'edges' in your request body.";
                    } else if (errorData.detail) {
                        errorMsg = typeof errorData.detail === "string"
                            ? errorData.detail
                            : JSON.stringify(errorData.detail);
                    }
                } catch {
                    errorMsg = "An unknown error occurred.";
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

            const data = await response.json();
            setResult(data);
            setError("");
        } catch (err: any) {
            setError("Network error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="modal">
            <h2>Compute Claim Credibility</h2>
            {/* Add your parameter input fields here if needed */}
            <button onClick={handleRun} disabled={loading}>
                {loading ? "Running..." : "Run"}
            </button>
            {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
            {result && (
                <div>
                    <h3>Results</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
            <button onClick={onClose}>Close</button>
        </div>
    );
};

export default ClaimCredibilityModal; 