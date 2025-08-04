import React from 'react';

const MessageBox: React.FC<{ message: any }> = ({ message }) => {
    return (
        <div className="text-left text-sm text-black whitespace-pre-line">
            {message["Claim Node ID"] && (
                <div><span className="font-semibold">Claim Node ID:</span> {message["Claim Node ID"]}</div>
            )}
            {message["Node Title"] && (
                <>
                    <div><span className="font-semibold">Node Title:</span> {message["Node Title"]}</div>
                    <div style={{ height: '0.75em' }} />
                </>
            )}
            {message["Claim Text"] && (
                <div><span className="font-semibold">Claim:</span> {message["Claim Text"]}</div>
            )}
            {message["Evidence ID"] && (
                <div><span className="font-semibold">Evidence ID:</span> {message["Evidence ID"]}</div>
            )}
            {message["Evidence Title"] && (
                <>
                    <div><span className="font-semibold">Evidence Title:</span> {message["Evidence Title"]}</div>
                    <div style={{ height: '0.75em' }} />
                </>
            )}
            {message["Evaluation"] && (
                <div><span className="font-semibold">Evaluation:</span> {message["Evaluation"]}</div>
            )}
            {message["Reasoning"] && (
                <div><span className="font-semibold">Reasoning:</span> {message["Reasoning"]}</div>
            )}
            {message["Confidence"] !== undefined && (
                <div><span className="font-semibold">Confidence:</span> {message["Confidence"]}</div>
            )}
            {message["Final Credibility Score"] !== undefined && (
                <div><span className="font-semibold">Credibility Score:</span> {message["Final Credibility Score"]}</div>
            )}

            {/* Pattern Match Fields */}
            {Object.keys(message).map((key) => {
                if (key.startsWith("Pattern ") && key.includes(":")) {
                    const patternName = key.split(": ")[1];
                    return (
                        <div key={key}>
                            <span className="font-semibold">Pattern:</span> {patternName}
                        </div>
                    );
                }
                return null;
            })}

            {message["Category"] && (
                <div><span className="font-semibold">Category:</span> {message["Category"]}</div>
            )}
            {message["Graph Pattern"] && (
                <div><span className="font-semibold">Graph Pattern:</span> {message["Graph Pattern"]}</div>
            )}
            {message["Graph Implication"] && (
                <div><span className="font-semibold">Graph Implication:</span> {message["Graph Implication"]}</div>
            )}
            {message["Severity"] && (
                <div><span className="font-semibold">Severity:</span> {message["Severity"]}</div>
            )}
            {message["Matched Nodes"] && (
                <div><span className="font-semibold">Matched Nodes:</span> {message["Matched Nodes"]}</div>
            )}
            {message["Node Claims"] && (
                <div><span className="font-semibold">Node Claims:</span> {message["Node Claims"]}</div>
            )}
            {message["Matched Edges"] && (
                <div><span className="font-semibold">Matched Edges:</span> {message["Matched Edges"]}</div>
            )}
            {message["Edge Details"] && (
                <div><span className="font-semibold">Edge Details:</span> {message["Edge Details"]}</div>
            )}
            {message["Pattern Details"] && (
                <div><span className="font-semibold">Pattern Details:</span> {message["Pattern Details"]}</div>
            )}

            {/* Argument Flaw Fields */}
            {Object.keys(message).map((key) => {
                if (key.startsWith("Flaw ") && key.includes(":")) {
                    const flawType = key.split(": ")[1];
                    return (
                        <div key={key}>
                            <span className="font-semibold">Flaw Type:</span> {flawType}
                        </div>
                    );
                }
                return null;
            })}

            {message["Affected Nodes"] && (
                <div><span className="font-semibold">Affected Nodes:</span> {message["Affected Nodes"]}</div>
            )}
            {message["Affected Edges"] && (
                <div><span className="font-semibold">Affected Edges:</span> {message["Affected Edges"]}</div>
            )}

            {/* Overall Assessment */}
            {message["Overall Assessment"] && (
                <div><span className="font-semibold">Overall Assessment:</span> {message["Overall Assessment"]}</div>
            )}
        </div>
    );
};

export default MessageBox; 