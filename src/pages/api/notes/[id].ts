import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid note id' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const token = authHeader.split(' ')[1];
    const email = getEmailFromSupabaseJWT(token);
    if (!email) return res.status(401).json({ error: 'Invalid token' });

    try {
        if (req.method === 'GET') {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];
            const supa = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
                token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
            );
            const { data, error } = await supa.from('notes').select('*').eq('id', id).single();
            if (error) return res.status(500).json({ error: 'Failed to fetch note' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { title, text, url } = req.body || {};
            if (!title || !text) return res.status(400).json({ error: 'Missing fields' });
            const supa = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
                { global: { headers: { Authorization: `Bearer ${token}` } } }
            );
            const { data, error } = await supa
                .from('notes')
                .update({ title, text, url, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('owner_email', email)
                .select()
                .single();

            if (error) return res.status(500).json({ error: 'Failed to update note' });
            return res.status(200).json({ note: data });
        }

        if (req.method === 'DELETE') {
            const supa = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
                { global: { headers: { Authorization: `Bearer ${token}` } } }
            );
            const { error } = await supa.from('notes').delete().eq('id', id).eq('owner_email', email);
            if (error) return res.status(500).json({ error: 'Failed to delete note' });
            return res.status(200).json({ message: 'Note deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notes [id] error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


