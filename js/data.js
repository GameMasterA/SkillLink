/**
 * SkillLink Central Marketplace Database Layer
 * Stores and manages seed datasets (Jobs, Freelancers, Categories, Proposals, Projects, Messages, Transactions)
 * and syncs with LocalStorage.
 */

function loadSkillLinkScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Unable to load ${src}`));
        document.head.appendChild(script);
    });
}

const appScriptRoot = /\/(admin|client|freelancer)\//.test(window.location.pathname) ? "../" : "";
window.supabaseBootstrapPromise = (async () => {
    if (!window.supabaseClient) {
        await loadSkillLinkScript(`${appScriptRoot}js/supabase-client.js`);
    }
    if (window.supabaseReady) {
        await window.supabaseReady;
    }
    return window.supabaseClient || null;
})().catch(error => {
    console.error("[SkillLink] Supabase initialization failed:", error);
    return null;
});

const STORAGE_KEYS = {
    JOBS: "skillLinkJobs",
    FREELANCERS: "skillLinkFreelancers",
    PROPOSALS: "skillLinkProposals",
    PROJECTS: "skillLinkProjects",
    MESSAGES: "skillLinkMessages",
    TRANSACTIONS: "skillLinkTransactions",
    SAVED_JOBS: "skillLinkSavedJobs",
    CATEGORIES: "skillLinkCategories"
};

const SEED_CATEGORIES = [];

const SEED_JOBS = [];

const SEED_FREELANCERS = [];

const SEED_PROPOSALS = [];

const SEED_PROJECTS = [];

const SEED_TRANSACTIONS = [];

const SEED_MESSAGES = [];

function initMarketplaceData() {
    const blankStore = {
        [STORAGE_KEYS.JOBS]: [],
        [STORAGE_KEYS.FREELANCERS]: [],
        [STORAGE_KEYS.CATEGORIES]: [],
        [STORAGE_KEYS.PROPOSALS]: [],
        [STORAGE_KEYS.PROJECTS]: [],
        [STORAGE_KEYS.TRANSACTIONS]: [],
        [STORAGE_KEYS.MESSAGES]: [],
        [STORAGE_KEYS.SAVED_JOBS]: []
    };

    const hasLegacyDemoData = () => {
        const demoMarkers = [
            "usr-demo-fl",
            "usr-demo-cl",
            "John Doe",
            "Sarah Miller",
            "Amina Bello",
            "Ataba O.",
            "David K.",
            "Marcus T."
        ];

        return Object.keys(blankStore).some(key => {
            try {
                const currentValue = JSON.parse(localStorage.getItem(key) || "null");
                if (!Array.isArray(currentValue)) return false;
                return currentValue.some(item => {
                    if (!item || typeof item !== "object") return false;
                    const candidateText = [
                        item.name,
                        item.title,
                        item.clientName,
                        item.jobTitle,
                        item.company,
                        item.email,
                        item.summary,
                        item.lastMessage
                    ].filter(Boolean).join(" ");
                    return demoMarkers.some(marker => candidateText.includes(marker));
                });
            } catch (error) {
                return false;
            }
        });
    };

    Object.entries(blankStore).forEach(([key, value]) => {
        const stored = localStorage.getItem(key);
        if (!stored || hasLegacyDemoData()) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    if (hasLegacyDemoData()) {
        localStorage.removeItem("skillLinkUser");
        localStorage.removeItem("skillLinkUsers");
    }

    syncFreelancersFromUsers();
}

// Data Getters & Setters
function normalizeJobRecord(job = {}) {
    const rawSkills = Array.isArray(job.skills)
        ? job.skills
        : typeof job.skills === "string"
            ? job.skills.split(",").map(skill => skill.trim()).filter(Boolean)
            : [];

    const normalized = {
        ...job,
        id: job.id || job.job_id || `job-${Date.now()}`,
        title: job.title || "Untitled Job",
        summary: job.summary || (typeof job.description === "string" ? job.description.substring(0, 100) : ""),
        description: job.description || "",
        category: job.category || "Web Development",
        budgetMin: Number(job.budgetMin ?? job.budget_min ?? 0),
        budgetMax: Number(job.budgetMax ?? job.budget_max ?? 0),
        experience: job.experience || "Intermediate",
        type: job.type || "Fixed Price",
        duration: job.duration || "1-2 Weeks",
        postedAgo: job.postedAgo || "Recently",
        postedTimestamp: Number(job.postedTimestamp ?? (job.created_at ? Date.parse(job.created_at) : Date.now())),
        proposalsCount: Number(job.proposalsCount ?? job.proposals_count ?? 0),
        skills: rawSkills.length > 0 ? rawSkills : ["Web Development"],
        status: job.status || "open",
        clientId: job.clientId || job.client_id || "local-client",
        client: job.client || {
            id: job.clientId || job.client_id || "local-client",
            name: job.client_name || "Client",
            rating: 0,
            jobsPosted: 0
        }
    };

    if (job.client_name) {
        normalized.client.name = job.client_name;
    }

    return normalized;
}

function getStoredJobs() {
    initMarketplaceData();
    const jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS)) || [];
    return Array.isArray(jobs) ? jobs.map(normalizeJobRecord) : [];
}

function saveStoredJobs(jobs) {
    const normalizedJobs = Array.isArray(jobs) ? jobs.map(normalizeJobRecord) : [];
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(normalizedJobs));
}

function normalizeFreelancerRecord(profile = {}) {
    const name = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Freelancer";
    const title = profile.title || profile.primary_skill || profile.skill || "Freelance Specialist";
    const skills = Array.isArray(profile.skills) && profile.skills.length > 0
        ? profile.skills
        : (profile.primary_skill ? [profile.primary_skill] : ["Web Development"]);

    return {
        id: profile.id || `freelancer-${Date.now()}`,
        name,
        title,
        rating: Number(profile.rating ?? 5.0),
        reviewsCount: Number(profile.reviews_count ?? profile.reviewsCount ?? 0),
        completedJobs: Number(profile.completed_jobs ?? profile.completedJobs ?? 0),
        startingPrice: Number(profile.starting_price ?? profile.startingPrice ?? 0),
        category: profile.primary_skill || profile.category || "Web Development",
        bio: profile.bio || "New freelancer profile ready for work.",
        skills,
        availability: profile.availability || "Available Now",
        email: profile.email || "",
        photo: profile.photo || "",
        portfolio: Array.isArray(profile.portfolio) ? profile.portfolio : [],
        reviews: Array.isArray(profile.reviews) ? profile.reviews : []
    };
}

function syncFreelancersFromUsers() {
    const storedUsers = (() => {
        try {
            const raw = JSON.parse(localStorage.getItem("skillLinkUsers") || "[]");
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            return [];
        }
    })();

    const liveFreelancers = storedUsers
        .filter(user => user && String(user.role || "").toLowerCase() === "freelancer")
        .map(user => normalizeFreelancerRecord({
            ...user,
            id: user.id,
            name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Freelancer",
            title: user.title || user.primarySkill || user.skill || "Freelance Specialist",
            primary_skill: user.primarySkill || user.primary_skill || user.skill || "Web Development",
            rating: user.rating ?? 5.0,
            reviews_count: user.reviewsCount ?? user.reviews_count ?? 0,
            completed_jobs: user.completedJobs ?? user.completed_jobs ?? 0,
            starting_price: user.startingPrice ?? user.starting_price ?? 0,
            availability: user.availability || "Available Now",
            skills: Array.isArray(user.skills) ? user.skills : []
        }));

    const storedFreelancers = (() => {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.FREELANCERS) || "[]");
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            return [];
        }
    })();

    const merged = [...liveFreelancers, ...storedFreelancers.filter(entry => !liveFreelancers.some(active => active.id === entry.id))];
    localStorage.setItem(STORAGE_KEYS.FREELANCERS, JSON.stringify(merged));
    return merged;
}

function getStoredFreelancers() {
    initMarketplaceData();
    return syncFreelancersFromUsers();
}

function saveStoredFreelancers(freelancers) {
    const normalized = Array.isArray(freelancers) ? freelancers.map(normalizeFreelancerRecord) : [];
    localStorage.setItem(STORAGE_KEYS.FREELANCERS, JSON.stringify(normalized));
}

function getStoredCategories() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
}

function getSavedJobIds() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_JOBS)) || [];
}

function toggleSaveJob(jobId) {
    let saved = getSavedJobIds();
    if (saved.includes(jobId)) {
        saved = saved.filter(id => id !== jobId);
    } else {
        saved.push(jobId);
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_JOBS, JSON.stringify(saved));
    return saved.includes(jobId);
}

async function createJobRecord(jobRecord) {
    await window.supabaseBootstrapPromise;
    const normalizedJob = normalizeJobRecord(jobRecord);
    const localJobs = getStoredJobs();
    const payload = {
        id: normalizedJob.id,
        title: normalizedJob.title,
        summary: normalizedJob.summary,
        description: normalizedJob.description,
        category: normalizedJob.category,
        budget_min: normalizedJob.budgetMin,
        budget_max: normalizedJob.budgetMax,
        experience: normalizedJob.experience,
        type: normalizedJob.type,
        duration: normalizedJob.duration,
        proposals_count: normalizedJob.proposalsCount,
        skills: normalizedJob.skills,
        status: normalizedJob.status,
        client_id: normalizedJob.clientId,
        created_at: new Date().toISOString()
    };

    localJobs.unshift(normalizedJob);
    saveStoredJobs(localJobs);

    if (typeof window !== "undefined" && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseClient.from("jobs").insert([payload]);
            if (error) {
                return { success: false, error, job: normalizedJob };
            }
            const cloudJob = Array.isArray(data) && data.length > 0 ? normalizeJobRecord(data[0]) : normalizedJob;
            const latestJobs = getStoredJobs();
            const mergedJobs = latestJobs.filter(job => String(job.id) !== String(normalizedJob.id));
            mergedJobs.unshift(cloudJob);
            saveStoredJobs(mergedJobs);
            return { success: true, job: cloudJob, error: null };
        } catch (error) {
            return { success: false, error, job: normalizedJob };
        }
    }

    return { success: true, job: normalizedJob, error: null };
}

async function updateJobRecord(jobId, updates) {
    await window.supabaseBootstrapPromise;
    const workingJobs = getStoredJobs();
    const index = workingJobs.findIndex(job => String(job.id) === String(jobId));
    if (index === -1) {
        return { success: false, error: new Error("Job not found"), job: null };
    }

    const currentJob = normalizeJobRecord(workingJobs[index]);
    const nextJob = normalizeJobRecord({ ...currentJob, ...updates, id: currentJob.id });
    workingJobs[index] = nextJob;
    saveStoredJobs(workingJobs);

    const jobPayload = {
        id: nextJob.id,
        title: nextJob.title,
        summary: nextJob.summary,
        description: nextJob.description,
        category: nextJob.category,
        budget_min: nextJob.budgetMin,
        budget_max: nextJob.budgetMax,
        experience: nextJob.experience,
        type: nextJob.type,
        duration: nextJob.duration,
        proposals_count: nextJob.proposalsCount,
        skills: nextJob.skills,
        status: nextJob.status,
        client_id: nextJob.clientId
    };

    if (typeof window !== "undefined" && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseClient.from("jobs").update(jobPayload, { id: jobId });
            if (error) {
                return { success: false, error, job: nextJob };
            }
            const updated = Array.isArray(data) && data.length > 0 ? normalizeJobRecord(data[0]) : nextJob;
            const refreshedJobs = getStoredJobs().map(job => String(job.id) === String(jobId) ? updated : job);
            saveStoredJobs(refreshedJobs);
            return { success: true, job: updated, error: null };
        } catch (error) {
            return { success: false, error, job: nextJob };
        }
    }

    return { success: true, job: nextJob, error: null };
}

async function deleteJobRecord(jobId) {
    await window.supabaseBootstrapPromise;
    const jobs = getStoredJobs();
    const remainingJobs = jobs.filter(job => String(job.id) !== String(jobId));
    saveStoredJobs(remainingJobs);

    if (typeof window !== "undefined" && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { error } = await window.supabaseClient.from("jobs").delete({ id: jobId });
            return { success: !error, error: error || null };
        } catch (error) {
            return { success: false, error };
        }
    }

    return { success: true, error: null };
}

function getStoredProposals() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPOSALS)) || [];
}

function saveProposal(proposalData) {
    const proposals = getStoredProposals();
    proposals.push(proposalData);
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals));
    
    const jobs = getStoredJobs();
    const jobIndex = jobs.findIndex(j => j.id === proposalData.jobId);
    if (jobIndex !== -1) {
        jobs[jobIndex].proposalsCount = (jobs[jobIndex].proposalsCount || 0) + 1;
        saveStoredJobs(jobs);
    }
}

function getStoredProjects() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
}

function saveStoredProjects(projects) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

function getStoredTransactions() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
}

function saveStoredTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

function getStoredMessages() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES)) || [];
}

function saveStoredMessages(messages) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

/**
 * Cloud Database Synchronization Engine (Supabase)
 * Pulls latest jobs and profiles from Supabase cloud when connected, with local persistence fallback.
 */
async function syncFromCloudDatabase() {
    await window.supabaseBootstrapPromise;
    if (typeof supabaseClient === "undefined" || !isSupabaseConfigured()) {
        return { success: false, reason: "Supabase credentials not yet configured in js/supabase-client.js" };
    }

    try {
        const jobsTable = await supabaseClient.from("jobs");
        const { data: cloudJobs, error: jobsErr } = await jobsTable.select();
        if (!jobsErr && cloudJobs && cloudJobs.length > 0) {
            saveStoredJobs(cloudJobs);
        }

        const profilesTable = await supabaseClient.from("profiles");
        const { data: cloudProfiles, error: profErr } = await profilesTable.select();
        if (!profErr && cloudProfiles && cloudProfiles.length > 0) {
            saveStoredFreelancers(cloudProfiles.filter(p => p.role === "freelancer"));
        }

        return { success: true, cloudJobsCount: cloudJobs ? cloudJobs.length : 0 };
    } catch (err) {
        console.warn("[SkillLink Cloud] Sync encountered an error:", err);
        return { success: false, error: err };
    }
}

// Initializer execution
initMarketplaceData();

// Window exports
window.normalizeJobRecord = normalizeJobRecord;
window.createJobRecord = createJobRecord;
window.updateJobRecord = updateJobRecord;
window.deleteJobRecord = deleteJobRecord;
window.getStoredJobs = getStoredJobs;
window.saveStoredJobs = saveStoredJobs;
window.normalizeFreelancerRecord = normalizeFreelancerRecord;
window.syncFreelancersFromUsers = syncFreelancersFromUsers;
window.getStoredFreelancers = getStoredFreelancers;
window.saveStoredFreelancers = saveStoredFreelancers;
window.getStoredCategories = getStoredCategories;
window.getSavedJobIds = getSavedJobIds;
window.toggleSaveJob = toggleSaveJob;
window.getStoredProposals = getStoredProposals;
window.saveProposal = saveProposal;
window.getStoredProjects = getStoredProjects;
window.saveStoredProjects = saveStoredProjects;
window.getStoredTransactions = getStoredTransactions;
window.saveStoredTransactions = saveStoredTransactions;
window.getStoredMessages = getStoredMessages;
window.saveStoredMessages = saveStoredMessages;
window.syncFromCloudDatabase = syncFromCloudDatabase;