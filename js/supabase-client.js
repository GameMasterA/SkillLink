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
let supabaseSessionRefreshPromise = null;
let supabaseFreshSessionUserId = null;
let supabaseFreshSessionUntil = 0;

function rememberFreshSupabaseSession(session) {
    if (!session?.user?.id || !session?.access_token) return;
    supabaseFreshSessionUserId = String(session.user.id);
    supabaseFreshSessionUntil = Date.now() + 45 * 60 * 1000;
    try {
        sessionStorage.setItem("skillLinkFreshSessionUserId", supabaseFreshSessionUserId);
        sessionStorage.setItem("skillLinkFreshSessionUntil", String(supabaseFreshSessionUntil));
    } catch (error) {
        console.warn("[SkillLink Auth] Unable to persist session freshness marker.", error);
    }
}

function isFreshSupabaseSession(session) {
    if (!session?.user?.id) return false;
    if (String(session.user.id) === supabaseFreshSessionUserId && Date.now() < supabaseFreshSessionUntil) return true;

    try {
        const storedUserId = sessionStorage.getItem("skillLinkFreshSessionUserId");
        const storedUntil = Number(sessionStorage.getItem("skillLinkFreshSessionUntil") || 0);
        if (storedUserId && storedUserId === String(session.user.id) && Date.now() < storedUntil) {
            supabaseFreshSessionUserId = storedUserId;
            supabaseFreshSessionUntil = storedUntil;
            return true;
        }
    } catch (error) {
        return false;
    }

    return false;
}

function clearFreshSupabaseSession() {
    supabaseFreshSessionUserId = null;
    supabaseFreshSessionUntil = 0;
    try {
        sessionStorage.removeItem("skillLinkFreshSessionUserId");
        sessionStorage.removeItem("skillLinkFreshSessionUntil");
    } catch (error) {
        console.warn("[SkillLink Auth] Unable to clear session freshness marker.", error);
    }
}

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
                        autoRefreshToken: false,
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

async function getAuthenticatedSessionData(forceRefresh = false) {
    try {
        const client = await getSupabaseSdkClient();
        let refreshAttempted = false;
        if (supabaseSessionRefreshPromise) {
            refreshAttempted = true;
            const refreshedSession = await supabaseSessionRefreshPromise;
            if (refreshedSession) {
                rememberFreshSupabaseSession(refreshedSession);
                return refreshedSession;
            }
        }

        const { data } = await client.auth.getSession();
        const session = data?.session || null;
        if (!session) {
            clearFreshSupabaseSession();
            return null;
        }
        if (!forceRefresh && isFreshSupabaseSession(session)) {
            return session;
        }

        const expiresAt = Number(session.expires_at || 0) * 1000;
        if (client.auth.refreshSession && (forceRefresh || (expiresAt > 0 && expiresAt <= Date.now() + 60000))) {
            if (!refreshAttempted) {
                if (!supabaseSessionRefreshPromise) {
                    supabaseSessionRefreshPromise = client.auth.refreshSession()
                        .then(refreshed => refreshed.error ? null : (refreshed.data?.session || null))
                        .catch(() => null)
                        .finally(() => { supabaseSessionRefreshPromise = null; });
                }
                const refreshedSession = await supabaseSessionRefreshPromise;
                if (refreshedSession) {
                    rememberFreshSupabaseSession(refreshedSession);
                    return refreshedSession;
                }
            }

            const currentSession = (await client.auth.getSession())?.data?.session || null;
            const currentExpiry = Number(currentSession?.expires_at || 0) * 1000;
            if (currentSession && (!currentExpiry || currentExpiry > Date.now())) {
                rememberFreshSupabaseSession(currentSession);
                return currentSession;
            }
            return null;
        }
        return session;
    } catch (error) {
        return null;
    }
}
const supabaseClient = {
    auth: {
        async signUp({ email, password, options = {} }) {
            try {
                const client = await getSupabaseSdkClient();
                const result = await client.auth.signUp({ email, password, options });
                rememberFreshSupabaseSession(result.data?.session);
                return result;
            } catch (error) {
                return { data: null, error };
            }
        },
        async signInWithPassword({ email, password }) {
            try {
                const client = await getSupabaseSdkClient();
                const result = await client.auth.signInWithPassword({ email, password });
                rememberFreshSupabaseSession(result.data?.session);
                return result;
            } catch (error) {
                return { data: null, error };
            }
        },
        async signOut() {
            try {
                const client = await getSupabaseSdkClient();
                const result = await client.auth.signOut();
                clearFreshSupabaseSession();
                return result;
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
                return { data: { session: await getAuthenticatedSessionData() }, error: null };
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

        const sendRequest = async (url, options = {}) => {
            let requestHeaders = await getRequestHeaders();
            let response = await fetch(url, { ...options, headers: requestHeaders });
            if (response.status === 401) {
                const refreshedSession = await getAuthenticatedSessionData(true);
                if (refreshedSession?.access_token) {
                    requestHeaders = {
                        ...requestHeaders,
                        Authorization: `Bearer ${refreshedSession.access_token}`
                    };
                    response = await fetch(url, { ...options, headers: requestHeaders });
                }
            }
            return { response, requestHeaders };
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

                    const requestUrl = `${baseUrl}?${params.toString()}`;
                    let { response: res, requestHeaders } = await sendRequest(requestUrl);
                    if (!res.ok && [401, 403].includes(res.status) && ["jobs", "profiles", "categories"].includes(table)) {
                        res = await fetch(requestUrl, {
                            headers: {
                                ...headers,
                                Authorization: `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
                            }
                        });
                    }
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
                    const { response: res } = await sendRequest(baseUrl, {
                        method: "POST",
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

                    const { response: res } = await sendRequest(`${baseUrl}?${params.toString()}`, {
                        method: "PATCH",
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

                    const { response: res } = await sendRequest(`${baseUrl}?${params.toString()}`, {
                        method: "DELETE"
                    });
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return { data: await res.json(), error: null };
                } catch (error) {
                    return { data: null, error };
                }
            }
        };
    },
    async rpc(functionName, parameters = {}) {
        if (!isSupabaseConfigured()) {
            return { data: null, error: new Error("Supabase not configured") };
        }

        try {
            let session = await getAuthenticatedSessionData();
            if (!session?.access_token) {
                return { data: null, error: new Error("Supabase user session is required for this request") };
            }

            const url = `${SUPABASE_CONFIG.URL}/rest/v1/rpc/${encodeURIComponent(functionName)}`;
            const options = {
                method: "POST",
                headers: {
                    apikey: SUPABASE_CONFIG.ANON_KEY,
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(parameters)
            };
            let response = await fetch(url, options);
            if (response.status === 401) {
                session = await getAuthenticatedSessionData(true);
                if (session?.access_token) {
                    options.headers.Authorization = `Bearer ${session.access_token}`;
                    response = await fetch(url, options);
                }
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return { data: await response.json(), error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
};

window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabaseReady = getSupabaseSdkClient().then(() => supabaseClient);
