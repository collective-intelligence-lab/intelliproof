// API Configuration
export const API_CONFIG = {
    // Backend URL for auth endpoints
    BACKEND_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production'
        ? 'https://intelliproofbackend.vercel.app'
        : 'http://localhost:8000'),
} as const;

// Helper function to build backend API URLs
export const buildBackendApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};

// API URLs - Auth endpoints go to backend, others use frontend API routes
export const API_URLS = {
    // Auth endpoints (handled by backend)
    SIGNUP: buildBackendApiUrl('/api/signup'),
    SIGNIN: buildBackendApiUrl('/api/signin'),
    SIGNOUT: buildBackendApiUrl('/api/signout'),
    USER_DATA: buildBackendApiUrl('/api/user/data'),

    // Frontend API routes (handled by Next.js)
    USER_ME: '/api/user/me',
    USER_STATS: '/api/user/stats',
    GRAPHS: '/api/graphs',
    SUPPORTING_DOCUMENTS: '/api/supporting-documents',
    SUPPORTING_DOCUMENTS_COUNT: '/api/supporting-documents/count',
    SUPPORTING_DOCUMENTS_UPLOAD: '/api/supporting-documents/upload',
} as const; 