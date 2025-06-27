// NOTE: You may need to install formidable: npm install formidable
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import type { Files, Fields, File, Part } from 'formidable';
import fs from 'fs';
import { supabase } from '../../../lib/supabaseClient';
import { getEmailFromSupabaseJWT } from '../../../lib/verifySupabaseToken';

export const config = { api: { bodyParser: false } };

// Sanitize filename to be safe for storage keys
function sanitizeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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

    // Fetch user_id from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();
    if (profileError || !profile) {
        return res.status(404).json({ error: 'User profile not found' });
    }
    const user_id = profile.user_id;

    try {
        console.log('Starting file upload process...');

        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            filter: (part: Part) => {
                console.log('Processing file part:', part.mimetype);
                return part.mimetype ? part.mimetype.startsWith('image/') || part.mimetype.startsWith('application/') : false;
            }
        });

        console.log('Parsing form data...');
        const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
            form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
                if (err) {
                    console.error('Form parsing error:', err);
                    reject(err);
                } else {
                    console.log('Form parsed successfully:', { fields, files });
                    resolve([fields, files]);
                }
            });
        });

        const fileArray = files.file;
        if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
            console.error('No file found in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = fileArray[0];
        console.log('File details:', {
            name: file.originalFilename,
            type: file.mimetype,
            size: file.size
        });

        console.log('Reading file data...');
        const fileData = fs.readFileSync(file.filepath);
        const safeFilename = sanitizeFilename(file.originalFilename || 'file');
        const filePath = `${user_id}/${Date.now()}-${safeFilename}`;

        console.log('Uploading to Supabase...');
        const { data, error: uploadError } = await supabase.storage
            .from('supporting-document-storage')
            .upload(filePath, fileData, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.mimetype || 'application/octet-stream'
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
        }

        console.log('Getting public URL...');
        const { data: { publicUrl } } = supabase.storage
            .from('supporting-document-storage')
            .getPublicUrl(filePath);

        // Clean up the temporary file
        console.log('Cleaning up temporary file...');
        fs.unlinkSync(file.filepath);

        console.log('Upload completed successfully:', publicUrl);
        return res.status(200).json({
            url: publicUrl,
            name: file.originalFilename,
            type: file.mimetype,
            size: file.size
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Upload failed: ' + (error.message || 'Unknown error'),
            details: error.stack
        });
    }
} 