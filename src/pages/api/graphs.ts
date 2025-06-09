import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { jwtDecode } from 'jwt-decode';

interface SupabaseJWT {
    email: string;
    sub: string;
    exp: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Get the user's email from the JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwtDecode<SupabaseJWT>(token);
        const email = decoded.email;

        if (!email) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (req.method === 'POST') {
            try {
                const { graph_data, graph_name } = req.body;

                console.log('Creating new graph:', { graph_name, graph_data }); // Debug log

                // Create new graph
                const { data, error } = await supabase
                    .from('graphs')
                    .insert({
                        owner_email: email,
                        graph_data,
                        graph_name,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating graph:', error);
                    return res.status(500).json({ error: 'Failed to create graph' });
                }

                return res.status(200).json(data);
            } catch (error) {
                console.error('Error in POST /api/graphs:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }

        if (req.method === 'PUT') {
            try {
                const { id, graph_data, graph_name } = req.body;

                console.log('Updating graph:', { id, graph_name, graph_data }); // Debug log

                // Update existing graph
                const { error } = await supabase
                    .from('graphs')
                    .update({
                        graph_data,
                        graph_name,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .eq('owner_email', email);

                if (error) {
                    console.error('Error updating graph:', error);
                    return res.status(500).json({ error: 'Failed to update graph' });
                }

                return res.status(200).json({ message: 'Graph updated successfully' });
            } catch (error) {
                console.error('Error in PUT /api/graphs:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }

        if (req.method === 'GET') {
            // Get all graphs for the user
            const { data, error } = await supabase
                .from('graphs')
                .select('*')
                .eq('owner_email', email)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching graphs:', error);
                return res.status(500).json({ error: 'Failed to fetch graphs' });
            }

            return res.status(200).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 