import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Evidence, ClaimType } from '../../types/graph';

export interface SupportingDocument {
    id: string;
    graph_id: string;
    name: string;
    type: string;
    url: string;
    size?: number;
    upload_date?: string;
    uploader_email?: string;
    metadata?: any;
}

export interface GraphItem {
    id: string;
    graph_name: string;
    graph_data: {
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
    created_at?: string;
    updated_at?: string;
    owner_email?: string;
}

export interface GraphsState {
    items: GraphItem[];
    selected: string | null;
    currentGraph: GraphItem | null;
    loading: boolean;
    error: string | null;
    supportingDocuments: { [graphId: string]: SupportingDocument[] };
}

export const fetchSupportingDocuments = createAsyncThunk(
    'graphs/fetchSupportingDocuments',
    async (graphId: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }
        const response = await axios.get(`/api/supporting-documents?graph_id=${graphId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return { graphId, documents: response.data };
    }
);

export const loadGraphs = createAsyncThunk<GraphItem[], string, { dispatch: any }>(
    'graphs/load',
    async (email: string, { dispatch }) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }

        const response = await axios.get(`/api/graphs`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        // For each graph, fetch supporting documents
        for (const graph of response.data) {
            if (graph.id) {
                dispatch(fetchSupportingDocuments(graph.id));
            }
        }
        return response.data;
    }
);

export const saveGraph = createAsyncThunk(
    'graphs/save',
    async ({ id, graphData, graphName }: { id?: string, graphData: any, graphName: string }) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        if (id) {
            // Update existing graph
            const response = await axios.put(`/api/graphs/${id}`, {
                graph_data: graphData,
                graph_name: graphName
            }, { headers });
            return response.data;
        } else {
            // Create new graph
            const response = await axios.post('/api/graphs', {
                graph_data: graphData,
                graph_name: graphName
            }, { headers });
            return response.data;
        }
    }
);

export const createGraph = createAsyncThunk('graphs/create', async ({ name, email }: { name: string, email: string }) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        throw new Error('No access token found');
    }

    console.log('Creating new graph with name:', name); // Debug log

    const res = await axios.post('/api/graphs', {
        graph_name: name,
        owner_email: email,
        graph_data: {
            nodes: [],
            edges: []
        }
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    console.log('Graph creation response:', res.data); // Debug log
    return res.data;
});

export const deleteGraph = createAsyncThunk('graphs/delete', async (id: string) => {
    const token = localStorage.getItem('access_token');
    console.log('DELETE graph:', { id, email: token });
    await axios.delete(`/api/graphs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return id;
});

const initialState: GraphsState = {
    items: [],
    selected: null,
    currentGraph: null,
    loading: false,
    error: null,
    supportingDocuments: {}, // { [graphId]: SupportingDocument[] }
};

const graphsSlice = createSlice({
    name: 'graphs',
    initialState,
    reducers: {
        setSelectedGraph(state, action: PayloadAction<string | null>) {
            state.selected = action.payload;
        },
        setCurrentGraph(state, action: PayloadAction<GraphItem | null>) {
            state.currentGraph = action.payload;
        },
        updateCurrentGraph(state, action: PayloadAction<any>) {
            if (state.currentGraph) {
                state.currentGraph.graph_data = action.payload;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadGraphs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadGraphs.fulfilled, (state, action) => {
                state.items = action.payload;
                state.loading = false;
            })
            .addCase(loadGraphs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to load graphs';
            })
            .addCase(fetchSupportingDocuments.fulfilled, (state, action) => {
                const { graphId, documents } = action.payload;
                state.supportingDocuments[graphId] = documents;
            })
            .addCase(saveGraph.fulfilled, (state, action) => {
                const index = state.items.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.currentGraph?.id === action.payload.id) {
                    state.currentGraph = action.payload;
                }
            })
            .addCase(saveGraph.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to save graph';
            })
            .addCase(createGraph.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            .addCase(deleteGraph.fulfilled, (state, action) => {
                state.items = state.items.filter(g => g.id !== action.payload);
                if (state.currentGraph?.id === action.payload) {
                    state.currentGraph = null;
                }
            });
    },
});

export const { setSelectedGraph, setCurrentGraph, updateCurrentGraph } = graphsSlice.actions;
export default graphsSlice.reducer; 