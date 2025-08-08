import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const { graph_id } = req.query;
            if (!graph_id || typeof graph_id !== 'string') {
                return res.status(400).json({ error: 'Missing or invalid graph_id' });
            }

            // Use per-request client so we can attach auth when present (optional on GET)
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];
            const supa = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
                token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
            );

            const { data, error } = await supa
                .from('notes')
                .select('*')
                .eq('graph_id', graph_id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Supabase fetch notes error:', error);
                return res.status(500).json({ error: error.message || 'Failed to fetch notes' });
            }
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
            const token = authHeader.split(' ')[1];
            const owner_email = getEmailFromSupabaseJWT(token);
            if (!owner_email) return res.status(401).json({ error: 'Invalid token' });

            const { graph_id, title, text, url } = req.body || {};
            if (!graph_id || !title || !text) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Create per-request supabase client with user's JWT for RLS
            const supa = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
                { global: { headers: { Authorization: `Bearer ${token}` } } }
            );

            const { data, error } = await supa
                .from('notes')
                .insert([{ graph_id, owner_email, title, text, url }])
                .select()
                .single();

            if (error) {
                console.error('Supabase create note error:', error);
                return res.status(500).json({ error: error.message || 'Failed to create note' });
            }
            return res.status(200).json({ note: data });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notes index error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


