import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to fetch your Phase 3 Analytics
export const fetchAviationAnalytics = async (rpcName: string) => {
    const { data, error } = await supabase.rpc(rpcName);
    if (error) {
        console.error(`Error fetching ${rpcName}:`, error);
        return null;
    }
    return data;
};