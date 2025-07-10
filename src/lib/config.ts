// API Configuration
export const API_CONFIG = {
    // Base URL for API calls
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production'
        ? 'https://intelliproofbackend.vercel.app'
        : 'http://localhost:8000'),

    // API Endpoints
    ENDPOINTS: {
        SIGNUP: '/api/signup',
        SIGNIN: '/api/signin',
        SIGNOUT: '/api/signout',
        USER_ME: '/api/user/me',
        USER_STATS: '/api/user/stats',
        USER_DATA: '/api/user/data',
        GRAPHS: '/api/graphs',
        SUPPORTING_DOCUMENTS: '/api/supporting-documents',
        SUPPORTING_DOCUMENTS_COUNT: '/api/supporting-documents/count',
        SUPPORTING_DOCUMENTS_UPLOAD: '/api/supporting-documents/upload',
    }
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Pre-built API URLs for common endpoints
export const API_URLS = {
    SIGNUP: buildApiUrl(API_CONFIG.ENDPOINTS.SIGNUP),
    SIGNIN: buildApiUrl(API_CONFIG.ENDPOINTS.SIGNIN),
    SIGNOUT: buildApiUrl(API_CONFIG.ENDPOINTS.SIGNOUT),
    USER_ME: buildApiUrl(API_CONFIG.ENDPOINTS.USER_ME),
    USER_STATS: buildApiUrl(API_CONFIG.ENDPOINTS.USER_STATS),
    USER_DATA: buildApiUrl(API_CONFIG.ENDPOINTS.USER_DATA),
    GRAPHS: buildApiUrl(API_CONFIG.ENDPOINTS.GRAPHS),
    SUPPORTING_DOCUMENTS: buildApiUrl(API_CONFIG.ENDPOINTS.SUPPORTING_DOCUMENTS),
    SUPPORTING_DOCUMENTS_COUNT: buildApiUrl(API_CONFIG.ENDPOINTS.SUPPORTING_DOCUMENTS_COUNT),
    SUPPORTING_DOCUMENTS_UPLOAD: buildApiUrl(API_CONFIG.ENDPOINTS.SUPPORTING_DOCUMENTS_UPLOAD),
} as const; 