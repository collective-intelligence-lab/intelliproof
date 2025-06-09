import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import graphsReducer from './slices/graphsSlice';

const store = configureStore({
    reducer: {
        user: userReducer,
        graphs: graphsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store; 