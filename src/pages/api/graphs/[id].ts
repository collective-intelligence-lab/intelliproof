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
            // Get the user's user_id from the profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('email', email)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching user profile:', profileError);
                return res.status(404).json({ error: 'User profile not found' });
            }

            const user_id = profile.user_id;

            // First, get all supporting documents for this graph to delete from storage
            const { data: supportingDocs, error: fetchError } = await supabase
                .from('supporting_documents')
                .select('url, name')
                .eq('graph_id', id);

            if (fetchError) {
                console.error('Error fetching supporting documents:', fetchError);
                return res.status(500).json({ error: 'Failed to fetch supporting documents' });
            }

            // Delete files from storage bucket
            if (supportingDocs && supportingDocs.length > 0) {
                const filePaths = supportingDocs.map(doc => {
                    // Extract file path from the URL
                    // URL format: https://bucket.supabase.co/storage/v1/object/public/supporting-document-storage/user_id/timestamp-filename
                    const url = doc.url;
                    const pathMatch = url.match(/supporting-document-storage\/(.+)$/);
                    if (pathMatch) {
                        return pathMatch[1];
                    }

                    // Fallback: construct path using user_id and document name
                    // This handles cases where URL parsing might fail
                    return `${user_id}/${doc.name}`;
                }).filter(Boolean);

                if (filePaths.length > 0) {
                    console.log('Deleting files from storage:', filePaths);
                    console.log('User ID:', user_id);

                    const { error: storageError } = await supabase.storage
                        .from('supporting-document-storage')
                        .remove(filePaths);

                    if (storageError) {
                        console.error('Error deleting files from storage:', storageError);
                        console.error('Storage error details:', JSON.stringify(storageError, null, 2));

                        // Try alternative approach: list and delete files in user's folder
                        try {
                            console.log('Attempting alternative deletion method...');
                            const { data: files, error: listError } = await supabase.storage
                                .from('supporting-document-storage')
                                .list(user_id);

                            if (!listError && files && files.length > 0) {
                                // Filter files that might belong to this graph's documents
                                const filesToDelete = files
                                    .filter(file => supportingDocs.some(doc => doc.url.includes(file.name)))
                                    .map(file => `${user_id}/${file.name}`);

                                if (filesToDelete.length > 0) {
                                    console.log('Attempting to delete specific files:', filesToDelete);
                                    const { error: altDeleteError } = await supabase.storage
                                        .from('supporting-document-storage')
                                        .remove(filesToDelete);

                                    if (altDeleteError) {
                                        console.error('Alternative deletion also failed:', altDeleteError);
                                    } else {
                                        console.log('Alternative deletion succeeded');
                                    }
                                }
                            }
                        } catch (altError) {
                            console.error('Alternative deletion method failed:', altError);
                        }
                    } else {
                        console.log('Successfully deleted files from storage');
                    }
                }
            }

            // Delete graph (this will cascade delete supporting_documents records)
            const { error } = await supabase
                .from('graphs')
                .delete()
                .eq('id', id)
                .eq('owner_email', email);

            if (error) {
                console.error('Error deleting graph:', error);
                return res.status(500).json({ error: 'Failed to delete graph' });
            }

            return res.status(200).json({ message: 'Graph and associated files deleted successfully' });
        } catch (error) {
            console.error('Error in DELETE /api/graphs/[id]:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
} 