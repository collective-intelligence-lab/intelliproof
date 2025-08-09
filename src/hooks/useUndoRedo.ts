import { useCallback, useEffect, useState } from "react";
import type { Edge, Node } from "reactflow";
import { useReactFlow } from "reactflow";

type UseUndoRedoOptions = {
    maxHistorySize?: number;
    enableShortcuts?: boolean;
};

type HistoryItem = {
    nodes: Node[];
    edges: Edge[];
};

export default function useUndoRedo({
    maxHistorySize = 100,
    enableShortcuts = true,
}: UseUndoRedoOptions = {}) {
    const [past, setPast] = useState<HistoryItem[]>([]);
    const [future, setFuture] = useState<HistoryItem[]>([]);

    const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

    const takeSnapshot = useCallback(() => {
        setPast((prev) => [
            ...prev.slice(prev.length - maxHistorySize + 1, prev.length),
            { nodes: getNodes(), edges: getEdges() },
        ]);
        setFuture([]);
    }, [getNodes, getEdges, maxHistorySize]);

    const undo = useCallback(() => {
        setPast((prev) => {
            const pastState = prev[prev.length - 1];
            if (!pastState) return prev;
            setFuture((f) => [...f, { nodes: getNodes(), edges: getEdges() }]);
            setNodes(pastState.nodes);
            setEdges(pastState.edges);
            return prev.slice(0, prev.length - 1);
        });
    }, [setNodes, setEdges, getNodes, getEdges]);

    const redo = useCallback(() => {
        setFuture((prev) => {
            const futureState = prev[prev.length - 1];
            if (!futureState) return prev;
            setPast((p) => [...p, { nodes: getNodes(), edges: getEdges() }]);
            setNodes(futureState.nodes);
            setEdges(futureState.edges);
            return prev.slice(0, prev.length - 1);
        });
    }, [setNodes, setEdges, getNodes, getEdges]);

    useEffect(() => {
        if (!enableShortcuts) return;
        const handler = (event: KeyboardEvent) => {
            const isZ = event.key?.toLowerCase() === "z";
            const isMeta = event.ctrlKey || event.metaKey;
            if (!isZ || !isMeta) return;
            if (event.shiftKey) redo();
            else undo();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [undo, redo, enableShortcuts]);

    return {
        undo,
        redo,
        takeSnapshot,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
    };
}


