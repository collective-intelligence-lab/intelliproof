import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import type { UserProfile } from '../../../types/user';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    console.log('DEBUG: Received token:', token);
    const email = getEmailFromSupabaseJWT(token);
    console.log('DEBUG: Extracted email:', email);

    if (!email) {
        console.log('DEBUG: No email found in token.');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    console.log('DEBUG: Supabase query result:', { data, error });

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(data as UserProfile);
} 