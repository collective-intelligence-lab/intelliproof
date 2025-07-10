import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

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
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid document ID' });
        }

        // Get the user's email from the JWT token for authorization
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        const email = getEmailFromSupabaseJWT(token);
        if (!email) {
            return res.status(401).json({ error: 'Invalid token' });
        }

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

            // First, get the document details to extract the file path and verify ownership
            const { data: document, error: fetchError } = await supabase
                .from('supporting_documents')
                .select('url, uploader_email, name')
                .eq('id', id)
                .single();

            if (fetchError || !document) {
                console.error('Error fetching document or document not found:', fetchError);
                return res.status(404).json({ error: 'Document not found' });
            }

            // Verify the user owns this document
            if (document.uploader_email !== email) {
                return res.status(403).json({ error: 'Unauthorized to delete this document' });
            }

            // Extract file path from URL to delete from storage
            const url = document.url;
            const pathMatch = url.match(/supporting-document-storage\/(.+)$/);
            let filePath = pathMatch ? pathMatch[1] : null;

            // If URL parsing fails, construct path using user_id and document name
            if (!filePath) {
                filePath = `${user_id}/${document.name}`;
            }

            // Delete from storage if we have a valid path
            if (filePath) {
                console.log('Deleting file from storage:', filePath);
                console.log('User ID:', user_id);

                const { error: storageError } = await supabase.storage
                    .from('supporting-document-storage')
                    .remove([filePath]);

                if (storageError) {
                    console.error('Error deleting file from storage:', storageError);
                    console.error('Storage error details:', JSON.stringify(storageError, null, 2));

                    // Try alternative approach: list files in user folder and find match
                    try {
                        console.log('Attempting alternative deletion method...');
                        const { data: files, error: listError } = await supabase.storage
                            .from('supporting-document-storage')
                            .list(user_id);

                        if (!listError && files && files.length > 0) {
                            // Find file that matches the document URL or name
                            const matchingFile = files.find(file =>
                                document.url.includes(file.name) || file.name === document.name
                            );

                            if (matchingFile) {
                                const altFilePath = `${user_id}/${matchingFile.name}`;
                                console.log('Attempting to delete file with alternative path:', altFilePath);

                                const { error: altDeleteError } = await supabase.storage
                                    .from('supporting-document-storage')
                                    .remove([altFilePath]);

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
                    console.log('Successfully deleted file from storage');
                }
            }

            // Delete the document record from database
            const { error: deleteError } = await supabase
                .from('supporting_documents')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error('Error deleting document record:', deleteError);
                return res.status(500).json({ error: 'Failed to delete document record' });
            }

            res.status(200).json({ message: 'Document deleted successfully' });
        } catch (e) {
            console.error('Unexpected error during document deletion:', e);
            res.status(500).json({ error: 'Unexpected error during deletion' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 