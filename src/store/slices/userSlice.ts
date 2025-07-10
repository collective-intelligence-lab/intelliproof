import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URLS } from '../../lib/config';

interface UserState {
    profile: {
        email: string;
        user_id: string;
        first_name: string;
        last_name: string;
        account_type: 'basic' | 'premium' | 'admin';
        country?: string;
        created_at: string;
    } | null;
    graphs: Array<{
        id: string;
        graph_data: any;
        created_at: string;
        updated_at: string;
        graph_name: string;
    }>;
    loading: boolean;
    error: string | null;
}

const initialState: UserState = {
    profile: null,
    graphs: [],
    loading: false,
    error: null,
};

export const fetchUserData = createAsyncThunk(
    'user/fetchUserData',
    async (accessToken: string) => {
        console.log('Fetching user data with token:', accessToken);
        try {
            const response = await axios.get(API_URLS.USER_DATA, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            console.log('User data response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching user data:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Error request:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error message:', error.message);
            }
            throw error;
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUserData: (state: UserState) => {
            state.profile = null;
            state.graphs = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserData.pending, (state: UserState) => {
                console.log('Fetch user data pending');
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserData.fulfilled, (state: UserState, action: PayloadAction<{ profile: UserState['profile']; graphs: UserState['graphs'] }>) => {
                console.log('Fetch user data fulfilled:', action.payload);
                state.loading = false;
                state.profile = action.payload.profile;
                state.graphs = action.payload.graphs;
            })
            .addCase(fetchUserData.rejected, (state: UserState, action) => {
                console.log('Fetch user data rejected:', action.error);
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch user data';
            });
    },
});

export const { clearUserData } = userSlice.actions;
export default userSlice.reducer; 