import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const loadGraphs = createAsyncThunk('graphs/load', async (email: string) => {
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
    return response.data;
});

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

const graphsSlice = createSlice({
    name: 'graphs',
    initialState: {
        items: [],
        selected: null,
        currentGraph: null,
        loading: false,
        error: null
    },
    reducers: {
        setSelectedGraph(state, action) {
            state.selected = action.payload;
        },
        setCurrentGraph(state, action) {
            state.currentGraph = action.payload;
        },
        updateCurrentGraph(state, action) {
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
            .addCase(saveGraph.fulfilled, (state, action) => {
                const index = state.items.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.currentGraph?.id === action.payload.id) {
                    state.currentGraph = action.payload;
                }
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