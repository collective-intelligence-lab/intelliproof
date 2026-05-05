// API Configuration
export const API_CONFIG = {
    // Empty string forces all API calls to be relative (e.g., '/api/...')
    // This allows the Next.js next.config.js proxy to catch and route the traffic.
    BACKEND_URL: '', 
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