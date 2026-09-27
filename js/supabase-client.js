/**
 * SkillLink — Supabase Cloud Database Client SDK & Config
 * Connects SkillLink directly to your Supabase project with automatic offline fallback.
 */

const SUPABASE_CONFIG = {
    // Replace these with your Supabase Project settings from https://supabase.com/dashboard/project/_/settings/api
    URL: window.SKILLLINK_SUPABASE_URL || "https://your-project.supabase.co",
    ANON_KEY: window.SKILLLINK_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};

// Check whether Supabase credentials are configured
function isSupabaseConfigured() {
    return SUPABASE_CONFIG.URL && 
           !SUPABASE_CONFIG.URL.includes("your-project") && 
           SUPABASE_CONFIG.ANON_KEY && 
           !SUPABASE_CONFIG.ANON_KEY.includes("...");
}

// Lightweight native fetch adapter for Supabase REST API (No heavy bundle required!)
const supabaseClient = {
    async from(table) {
        const baseUrl = `${SUPABASE_CONFIG.URL}/rest/v1/${table}`;
        const headers = {
            "apikey": SUPABASE_CONFIG.ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        };

        return {
            async select(query = "*") {
                if (!isSupabaseConfigured()) {
                    console.info(`[SkillLink Cloud] Supabase not connected. Using local storage for '${table}'.`);
                    return { data: null, error: new Error("Supabase not configured") };
                }
                try {
                    const res = await fetch(`${baseUrl}?select=${encodeURIComponent(query)}`, { headers });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    return { data, error: null };
                } catch (error) {
                    console.warn(`[SkillLink Cloud] Failed to fetch from '${table}':`, error);
                    return { data: null, error };
                }
            },
            async insert(payload) {
                if (!isSupabaseConfigured()) {
                    return { data: null, error: new Error("Supabase not configured") };
                }
                try {
                    const res = await fetch(baseUrl, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    return { data, error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },
            async update(payload, matchColumn, matchValue) {
                if (!isSupabaseConfigured()) {
                    return { data: null, error: new Error("Supabase not configured") };
                }
                try {
                    const res = await fetch(`${baseUrl}?${matchColumn}=eq.${encodeURIComponent(matchValue)}`, {
                        method: "PATCH",
                        headers,
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    return { data, error: null };
                } catch (error) {
                    return { data: null, error };
                }
            }
        };
    }
};

window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
