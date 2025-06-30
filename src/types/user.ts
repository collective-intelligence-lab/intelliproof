export interface UserProfile {
    email: string;
    first_name: string;
    last_name: string;
    country: string;
    account_type: 'basic' | 'premium' | 'admin';
    created_at: string;
}

export interface UserStats {
    graphsCreated: number;
    lastActive: string | null;
} 