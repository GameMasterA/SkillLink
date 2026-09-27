/**
 * SkillLink — Supabase Cloud Database Client SDK & Config
 * Connects SkillLink directly to your Supabase project with automatic offline fallback.
 */

const SUPABASE_CONFIG = {
    URL: window.SKILLLINK_SUPABASE_URL || "https://tqttchoronrytjobprkr.supabase.co",
    ANON_KEY: window.SKILLLINK_SUPABASE_ANON_KEY || "sb_publishable_sX-NAmGuMHn812Qozmfhtg_wjPqKyiA"
};

function isSupabaseConfigured() {
    return !!SUPABASE_CONFIG.URL &&
           !SUPABASE_CONFIG.URL.includes("your-project") &&
           !!SUPABASE_CONFIG.ANON_KEY &&
           !SUPABASE_CONFIG.ANON_KEY.includes("your-anon-key");
}

const supabase = window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

const supabaseClient = {
    auth: {
        async signUp({ email, password, options = {} }) {
            if (!supabase) {
                return { data: null, error: new Error("Supabase client is not available") };
            }
            try {
                return await supabase.auth.signUp({ email, password, options });
            } catch (error) {
                return { data: null, error };
            }
        },
        async signInWithPassword({ email, password }) {
            if (!supabase) {
                return { data: null, error: new Error("Supabase client is not available") };
            }
            try {
                return await supabase.auth.signInWithPassword({ email, password });
            } catch (error) {
                return { data: null, error };
            }
        },
        async signOut() {
            if (!supabase) {
                return { error: new Error("Supabase client is not available") };
            }
            try {
                return await supabase.auth.signOut();
            } catch (error) {
                return { error };
            }
        },
        async getUser() {
            if (!supabase) {
                return { data: { user: null }, error: new Error("Supabase client is not available") };
            }
            try {
                return await supabase.auth.getUser();
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
        async getSession() {
            if (!supabase) {
                return { data: { session: null }, error: new Error("Supabase client is not available") };
            }
            try {
                return await supabase.auth.getSession();
            } catch (error) {
                return { data: { session: null }, error };
            }
        }
    },
    from(table) {
        const baseUrl = `${SUPABASE_CONFIG.URL}/rest/v1/${table}`;
        const headers = {
            apikey: SUPABASE_CONFIG.ANON_KEY,
            Authorization: `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
        };

        return {
            async select(columns = "*", filters = {}) {
                if (!isSupabaseConfigured()) {
                    return { data: null, error: new Error("Supabase not configured") };
                }

                try {
                    const params = new URLSearchParams();
                    params.set("select", columns);
                    Object.entries(filters).forEach(([column, value]) => {
                        params.append(column, `eq.${value}`);
                    });

                    const res = await fetch(`${baseUrl}?${params.toString()}`, { headers });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return { data: await res.json(), error: null };
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
                    return { data: await res.json(), error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },
            async update(payload, filters = {}) {
                if (!isSupabaseConfigured()) {
                    return { data: null, error: new Error("Supabase not configured") };
                }

                try {
                    const params = new URLSearchParams();
                    Object.entries(filters).forEach(([column, value]) => {
                        params.append(column, `eq.${value}`);
                    });

                    const res = await fetch(`${baseUrl}?${params.toString()}`, {
                        method: "PATCH",
                        headers,
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return { data: await res.json(), error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },
            async delete(filters = {}) {
                if (!isSupabaseConfigured()) {
                    return { data: null, error: new Error("Supabase not configured") };
                }

                try {
                    const params = new URLSearchParams();
                    Object.entries(filters).forEach(([column, value]) => {
                        params.append(column, `eq.${value}`);
                    });

                    const res = await fetch(`${baseUrl}?${params.toString()}`, {
                        method: "DELETE",
                        headers
                    });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return { data: await res.json(), error: null };
                } catch (error) {
                    return { data: null, error };
                }
            }
        };
    }
};

window.supabase = supabase;
window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
