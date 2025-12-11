import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Vercel provides these env vars automatically if configured
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Optional: Better for admin tasks if available

// Use Service Key if available for bypassing RLS, otherwise Anon
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

export default async function handler(req, res) {
    // CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const payload = req.body;
    console.log('Webhook Received (Vercel):', payload);

    try {
        // 1. Log to Database
        const { data: logData, error: logError } = await supabase.from('webhook_logs').insert([{
            payload: payload,
            source: payload.source || 'cakto',
            status: 'received'
        }]).select().single();

        if (logError) {
            console.error('Log Error:', logError);
            // Continue processing even if logging fails? Maybe not.
        }

        const logId = logData?.id;

        // 2. Process Purchase
        const email = payload.contact?.email || payload.email;
        const status = payload.status || payload.event; // 'paid', 'approved', etc.

        if ((status === 'paid' || status === 'approved') && email) {
            // Check if license exists
            const { data: existing } = await supabase
                .from('licenses')
                .select('id')
                .eq('reserved_email', email)
                .single();

            if (!existing) {
                // Generate Key
                const randomKey = 'KEY-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

                // insert
                const { error: licError } = await supabase.from('licenses').insert([{
                    key_string: randomKey,
                    status: 'unused',
                    reserved_email: email
                }]);

                if (!licError) {
                    console.log(`License created for ${email}`);
                    if (logId) {
                        await supabase.from('webhook_logs').update({ status: 'processed' }).eq('id', logId);
                    }
                    return res.status(200).json({ success: true, message: 'License Created' });
                } else {
                    console.error('License Error:', licError);
                    return res.status(500).json({ error: 'Failed to create license' });
                }
            } else {
                console.log(`License already exists for ${email}`);
                if (logId) {
                    await supabase.from('webhook_logs').update({ status: 'ignored_exists' }).eq('id', logId);
                }
                return res.status(200).json({ success: true, message: 'License Already Exists' });
            }
        }

        return res.status(200).json({ success: true, message: 'Event Processed (No Action Taken)' });

    } catch (err) {
        console.error('Webhook Internal Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
