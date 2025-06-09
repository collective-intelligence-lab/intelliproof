import { jwtDecode } from 'jwt-decode';

interface SupabaseJWT {
    email: string;
    sub: string;
    exp: number;
}

export function getEmailFromSupabaseJWT(token: string): string | null {
    try {
        const decoded = jwtDecode<SupabaseJWT>(token);
        return decoded.email;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
} 