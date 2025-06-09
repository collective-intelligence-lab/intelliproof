import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import type { UserStats } from '../../../types/user';
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

    // Count graphs created
    const { count, error: countError } = await supabase
        .from('graphs')
        .select('id', { count: 'exact', head: true })
        .eq('owner_email', email);

    console.log('DEBUG: Supabase count query result:', { count, countError });

    if (countError) return res.status(500).json({ error: countError.message });

    // Get last active (latest updated_at)
    const { data: lastGraph, error: lastActiveError } = await supabase
        .from('graphs')
        .select('updated_at')
        .eq('owner_email', email)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    console.log('DEBUG: Supabase last active query result:', { lastGraph, lastActiveError });

    if (lastActiveError && lastActiveError.code !== 'PGRST116') // ignore no rows error
        return res.status(500).json({ error: lastActiveError.message });

    const stats: UserStats = {
        graphsCreated: count ?? 0,
        lastActive: lastGraph?.updated_at ?? null,
    };

    res.status(200).json(stats);
} 