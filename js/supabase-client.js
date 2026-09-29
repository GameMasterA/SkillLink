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

let supabaseSdkClient = null;
let supabaseSdkPromise = null;

function getSupabaseSdkClient() {
    if (supabaseSdkClient) return Promise.resolve(supabaseSdkClient);

    if (!supabaseSdkPromise) {
        supabaseSdkPromise = new Promise((resolve, reject) => {
            const initializeClient = () => {
                if (!window.supabase || typeof window.supabase.createClient !== "function") {
                    reject(new Error("Supabase SDK did not load"));
                    return;
                }

                supabaseSdkClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                });
                resolve(supabaseSdkClient);
            };

            if (window.supabase && typeof window.supabase.createClient === "function") {
                initializeClient();
                return;
            }

            const sdkScript = document.createElement("script");
            sdkScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
            sdkScript.onload = initializeClient;
            sdkScript.onerror = () => reject(new Error("Unable to load Supabase SDK"));
            document.head.appendChild(sdkScript);
        });
    }

    return supabaseSdkPromise;
}

async function getAuthenticatedSessionData() {
    try {
        const client = await getSupabaseSdkClient();
        const { data } = await client.auth.getSession();
        return data?.session || null;
    } catch (error) {
        return null;
    }
}

const supabaseClient = {
    auth: {
        async signUp({ email, password, options = {} }) {
            try {
                const client = await getSupabaseSdkClient();
                return await client.auth.signUp({ email, password, options });
            } catch (error) {
                return { data: null, error };
            }
        },
        async signInWithPassword({ email, password }) {
            try {
                const client = await getSupabaseSdkClient();
                return await client.auth.signInWithPassword({ email, password });
            } catch (error) {
                return { data: null, error };
            }
        },
        async signOut() {
            try {
                const client = await getSupabaseSdkClient();
                return await client.auth.signOut();
            } catch (error) {
                return { error };
            }
        },
        async getUser() {
            try {
                const client = await getSupabaseSdkClient();
                return await client.auth.getUser();
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
        async getSession() {
            try {
                const client = await getSupabaseSdkClient();
                return await client.auth.getSession();
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

        const getRequestHeaders = async () => {
            const requestHeaders = { ...headers };
            try {
                const session = await getAuthenticatedSessionData();
                if (session?.access_token) {
                    requestHeaders.apikey = SUPABASE_CONFIG.ANON_KEY;
                    requestHeaders.Authorization = `Bearer ${session.access_token}`;
                }
            } catch (error) {
                console.warn("[SkillLink Cloud] No authenticated session was available for this request.", error);
            }
            return requestHeaders;
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

                    const res = await fetch(`${baseUrl}?${params.toString()}`, { headers: await getRequestHeaders() });
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
                        headers: await getRequestHeaders(),
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
                        headers: await getRequestHeaders(),
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
                        headers: await getRequestHeaders()
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

window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabaseReady = getSupabaseSdkClient().then(() => supabaseClient);
