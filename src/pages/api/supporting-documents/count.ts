import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { graph_id } = req.query;

    if (!graph_id || typeof graph_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid graph_id' });
    }

    try {
        const { count, error } = await supabase
            .from('supporting_documents')
            .select('*', { count: 'exact', head: true })
            .eq('graph_id', graph_id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ count: count ?? 0 });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
} 