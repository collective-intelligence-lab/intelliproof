import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || id === 'undefined') {
        return res.status(400).json({ error: 'Invalid or missing graph ID' });
    }

    // Get the user's email from the JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const email = getEmailFromSupabaseJWT(token);
    if (!email) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (req.method === 'GET') {
        try {
            // Fetch the graph
            const { data, error } = await supabase
                .from('graphs')
                .select('*')
                .eq('id', id)
                .eq('owner_email', email)
                .single();

            if (error) {
                console.error('Error fetching graph:', error);
                return res.status(500).json({ error: 'Failed to fetch graph' });
            }

            if (!data) {
                return res.status(404).json({ error: 'Graph not found' });
            }

            return res.status(200).json(data);
        } catch (error) {
            console.error('Error in GET /api/graphs/[id]:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { graph_data, graph_name } = req.body;

            console.log('Updating graph:', { id, graph_name, graph_data }); // Debug log

            // Update existing graph
            const { data, error } = await supabase
                .from('graphs')
                .update({
                    graph_data,
                    graph_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('owner_email', email)
                .select()
                .single();

            if (error) {
                console.error('Error updating graph:', error);
                return res.status(500).json({ error: 'Failed to update graph' });
            }

            return res.status(200).json(data);
        } catch (error) {
            console.error('Error in PUT /api/graphs/[id]:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Delete graph
            const { error } = await supabase
                .from('graphs')
                .delete()
                .eq('id', id)
                .eq('owner_email', email);

            if (error) {
                console.error('Error deleting graph:', error);
                return res.status(500).json({ error: 'Failed to delete graph' });
            }

            return res.status(200).json({ message: 'Graph deleted successfully' });
        } catch (error) {
            console.error('Error in DELETE /api/graphs/[id]:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
} 