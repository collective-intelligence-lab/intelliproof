import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { graph_id } = req.query;
        if (!graph_id) {
            return res.status(400).json({ error: 'Missing graph_id parameter' });
        }

        try {
            const { data, error } = await supabase
                .from('supporting_documents')
                .select('*')
                .eq('graph_id', graph_id);

            if (error) {
                console.error('DB query error:', error);
                return res.status(500).json({ error: 'Database query failed' });
            }

            res.status(200).json(data);
        } catch (e) {
            console.error('Unexpected error during document fetch:', e);
            res.status(500).json({ error: 'Unexpected error' });
        }
    } else if (req.method === 'POST') {
        const { graph_id, name, type, url, uploader_email } = req.body;
        if (!graph_id || !name || !type || !url || !uploader_email) {
            console.error('Missing fields:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const { data, error } = await supabase
                .from('supporting_documents')
                .insert([{ graph_id, name, type, url, uploader_email }])
                .select()
                .single();

            if (error) {
                console.error('DB insert error:', error);
                return res.status(500).json({ error: 'Database insert failed' });
            }

            console.log('Supporting document saved:', data);
            res.status(200).json({ document: data });
        } catch (e) {
            console.error('Unexpected error during metadata save:', e);
            res.status(500).json({ error: 'Unexpected error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 