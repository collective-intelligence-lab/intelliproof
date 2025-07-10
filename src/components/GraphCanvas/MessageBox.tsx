import React from 'react';

const MessageBox: React.FC<{ message: any }> = ({ message }) => {
    return (
        <div className="text-left text-sm text-black whitespace-pre-line">
            {message["Claim Node ID"] && (
                <div><span className="font-semibold">Claim Node ID:</span> {message["Claim Node ID"]}</div>
            )}
            {message["Claim Text"] && (
                <div><span className="font-semibold">Claim:</span> {message["Claim Text"]}</div>
            )}
            {message["Evidence ID"] && (
                <div><span className="font-semibold">Evidence ID:</span> {message["Evidence ID"]}</div>
            )}
            {message["Evidence Title"] && (
                <div><span className="font-semibold">Evidence Title:</span> {message["Evidence Title"]}</div>
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
        </div>
    );
};

export default MessageBox; 