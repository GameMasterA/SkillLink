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

    const demoEmails = new Set([
        "admin@skilllink.com",
        "freelancer@skilllink.com",
        "client@skilllink.com"
    ]);
    const isLegacyDemoRecord = item => {
        if (!item || typeof item !== "object") return false;
        const id = String(item.id || "").trim().toLowerCase();
        const email = String(item.email || "").trim().toLowerCase();
        return id.startsWith("usr-demo-") || demoEmails.has(email);
    };

    Object.entries(blankStore).forEach(([key, value]) => {
        const stored = localStorage.getItem(key);
        if (!stored) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        try {
            const records = JSON.parse(stored);
            if (!Array.isArray(records)) {
                localStorage.setItem(key, JSON.stringify(value));
                return;
            }

            const filteredRecords = records.filter(record => !isLegacyDemoRecord(record));
            if (filteredRecords.length !== records.length) {
                localStorage.setItem(key, JSON.stringify(filteredRecords));
            }
        } catch (error) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    try {
        const users = JSON.parse(localStorage.getItem("skillLinkUsers") || "[]");
        if (Array.isArray(users)) {
            const filteredUsers = users.filter(user => !isLegacyDemoRecord(user));
            if (filteredUsers.length !== users.length) {
                localStorage.setItem("skillLinkUsers", JSON.stringify(filteredUsers));
            }
        }
    } catch (error) {
        localStorage.setItem("skillLinkUsers", JSON.stringify([]));
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("skillLinkUser") || "null");
        if (isLegacyDemoRecord(currentUser)) {
            localStorage.removeItem("skillLinkUser");
        }
    } catch (error) {
        localStorage.removeItem("skillLinkUser");
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

function normalizeProposalRecord(proposal = {}) {
    return {
        ...proposal,
        id: proposal.id || `proposal-${Date.now()}`,
        jobId: proposal.jobId || proposal.job_id || "",
        jobTitle: proposal.jobTitle || proposal.job_title || proposal.title || "Job Proposal",
        clientId: proposal.clientId || proposal.client_id || "",
        freelancerId: proposal.freelancerId || proposal.freelancer_id || "",
        freelancerName: proposal.freelancerName || proposal.freelancer_name || "Freelancer",
        clientName: proposal.clientName || proposal.client_name || "Client",
        bidAmount: Number(proposal.bidAmount ?? proposal.bid_amount ?? 0),
        estimatedDuration: proposal.estimatedDuration || proposal.delivery_time || proposal.deliveryTime || "",
        coverLetter: proposal.coverLetter || proposal.cover_letter || "",
        status: proposal.status || "pending",
        submittedDate: proposal.submittedDate || proposal.created_at || ""
    };
}

function normalizeProjectRecord(project = {}) {
    return {
        ...project,
        id: project.id || "",
        jobId: project.jobId || project.job_id || "",
        jobTitle: project.jobTitle || project.title || "Contract",
        clientId: project.clientId || project.client_id || "",
        freelancerId: project.freelancerId || project.freelancer_id || "",
        clientName: project.clientName || project.client_name || "Client",
        freelancerName: project.freelancerName || project.freelancer_name || "Freelancer",
        amount: Number(project.amount || 0),
        status: project.status || "pending",
        milestones: Array.isArray(project.milestones) ? project.milestones : [],
        progress: Number(project.progress || 0),
        createdAt: project.createdAt || project.created_at || "",
        startDate: project.startDate || (project.created_at ? new Date(project.created_at).toLocaleDateString() : "Recently")
    };
}

function normalizeTransactionRecord(transaction = {}) {
    const createdAt = transaction.createdAt || transaction.created_at || "";
    return {
        ...transaction,
        id: transaction.id || "",
        userId: transaction.userId || transaction.user_id || "",
        title: transaction.title || transaction.reference || transaction.type || "Transaction",
        type: transaction.type || "payment",
        amount: Number(transaction.amount || 0),
        status: transaction.status || "pending",
        reference: transaction.reference || "",
        createdAt,
        date: transaction.date || (createdAt ? new Date(createdAt).toLocaleDateString() : "")
    };
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
    const proposals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPOSALS)) || [];
    return Array.isArray(proposals) ? proposals.map(normalizeProposalRecord) : [];
}

function saveStoredProposals(proposals) {
    const normalized = Array.isArray(proposals) ? proposals.map(normalizeProposalRecord) : [];
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(normalized));
}

function mergeProposalRecords(existingProposals, incomingProposals) {
    const proposalsByApplication = new Map();
    [...existingProposals, ...incomingProposals].forEach(proposal => {
        const normalized = normalizeProposalRecord(proposal);
        const key = `${normalized.jobId}:${normalized.freelancerId}`;
        proposalsByApplication.set(key, {
            ...proposalsByApplication.get(key),
            ...normalized
        });
    });
    return [...proposalsByApplication.values()];
}

function cacheConfirmedProposal(proposalData) {
    const job = getStoredJobs().find(entry => String(entry.id) === String(proposalData.job_id || proposalData.jobId));
    const proposal = normalizeProposalRecord({
        ...proposalData,
        job_title: proposalData.job_title || job?.title || "Job Proposal",
        client_id: proposalData.client_id || job?.clientId || job?.client_id || "",
        client_name: proposalData.client_name || job?.client?.name || "Client",
        cloudConfirmed: true
    });
    const proposals = getStoredProposals().filter(entry =>
        String(entry.jobId) !== String(proposal.jobId) ||
        String(entry.freelancerId) !== String(proposal.freelancerId)
    );
    saveStoredProposals([...proposals, proposal]);
    return proposal;
}

async function createProposalRecord(proposalData) {
    await window.supabaseBootstrapPromise;

    try {
        if (!window.isSupabaseConfigured?.() || !window.supabaseClient) {
            throw new Error("Supabase is not configured. Please try again later.");
        }

        const localUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
        const session = (await window.supabaseClient.auth.getSession())?.data?.session;
        if (!session?.user?.id) {
            throw new Error("Sign in to your SkillLink account before submitting a proposal.");
        }
        if (String(session.user.id) !== String(proposalData.freelancerId || localUser?.id || "")) {
            throw new Error("Your signed-in Supabase account does not match this freelancer profile. Sign out and sign in again.");
        }

        const existingResult = await window.supabaseClient.from("proposals").select("*", {
            job_id: String(proposalData.jobId),
            freelancer_id: String(session.user.id)
        });
        if (existingResult.error) throw existingResult.error;
        if (Array.isArray(existingResult.data) && existingResult.data[0]) {
            return {
                success: true,
                proposal: cacheConfirmedProposal(existingResult.data[0]),
                alreadySubmitted: true,
                error: null
            };
        }

        const { data, error } = await window.supabaseClient.rpc("submit_proposal", {
            p_job_id: String(proposalData.jobId),
            p_bid_amount: Number(proposalData.bidAmount),
            p_delivery_time: String(proposalData.estimatedDuration || "1 week"),
            p_cover_letter: String(proposalData.coverLetter || "")
        });
        if (error) {
            if (String(error.message || "").includes("409")) {
                const { data: existingProposals, error: lookupError } = await window.supabaseClient
                    .from("proposals")
                    .select("*", {
                        job_id: String(proposalData.jobId),
                        freelancer_id: String(session.user.id)
                    });
                const existingProposal = Array.isArray(existingProposals) ? existingProposals[0] : null;
                if (!lookupError && existingProposal) {
                    const proposal = cacheConfirmedProposal(existingProposal);
                    return { success: true, proposal, alreadySubmitted: true, error: null };
                }
            }
            throw error;
        }

        const proposal = cacheConfirmedProposal(data);

        if (data.proposals_count !== undefined) {
            const jobs = getStoredJobs();
            const job = jobs.find(entry => String(entry.id) === String(proposal.jobId));
            if (job) {
                job.proposalsCount = Number(data.proposals_count);
                saveStoredJobs(jobs);
            }
        }
        return { success: true, proposal, error: null };
    } catch (error) {
        return { success: false, error };
    }
}
async function acceptProposalRecord(proposalId) {
    await window.supabaseBootstrapPromise;
    if (!window.isSupabaseConfigured?.()) {
        return { success: false, error: new Error("Cloud contracts are not configured.") };
    }

    const { data, error } = await window.supabaseClient.rpc("accept_proposal", {
        p_proposal_id: String(proposalId)
    });
    if (error) return { success: false, error };

    const proposal = normalizeProposalRecord(data.proposal);
    const project = normalizeProjectRecord(data.project);
    saveStoredProposals(getStoredProposals().map(entry =>
        String(entry.id) === String(proposal.id) ? proposal : entry
    ));
    saveStoredProjects([...getStoredProjects().filter(entry => String(entry.id) !== String(project.id)), project]);
    return { success: true, proposal, project, error: null };
}

function getStoredProjects() {
    initMarketplaceData();
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
    return Array.isArray(projects) ? projects.map(normalizeProjectRecord) : [];
}

function saveStoredProjects(projects) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify((projects || []).map(normalizeProjectRecord)));
}

function getStoredTransactions() {
    initMarketplaceData();
    const transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    return Array.isArray(transactions) ? transactions.map(normalizeTransactionRecord) : [];
}

function saveStoredTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify((transactions || []).map(normalizeTransactionRecord)));
}

async function syncAccountWorkData(userId, role) {
    await window.supabaseBootstrapPromise;
    if (!window.isSupabaseConfigured?.() || !userId) return { success: false, reason: "Cloud account sync is unavailable." };

    const session = (await window.supabaseClient.auth.getSession())?.data?.session;
    if (!session?.user?.id || String(session.user.id) !== String(userId)) {
        return { success: false, reason: "A current sign-in is required to sync account data." };
    }

    const jobsSync = await syncFromCloudDatabase();
    if (!jobsSync.success) {
        console.warn("[SkillLink Work] Job context refresh failed before account sync.", jobsSync.error || jobsSync.reason);
    }

    const isClient = role === "client";
    const proposalOwnerColumn = isClient ? "client_id" : "freelancer_id";
    const projectOwnerColumn = isClient ? "client_id" : "freelancer_id";
    const [projectsResult, transactionsResult] = await Promise.all([
        window.supabaseClient.from("projects").select("*", { [projectOwnerColumn]: String(userId) }),
        window.supabaseClient.from("transactions").select("*", { user_id: String(userId) })
    ]);
    if (projectsResult.error) return { success: false, error: projectsResult.error };
    if (transactionsResult.error) return { success: false, error: transactionsResult.error };

    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const counterpartIds = [...new Set((projectsResult.data || []).map(project => String(isClient ? project.freelancer_id : project.client_id)).filter(Boolean))];
    const counterpartResults = await Promise.all(counterpartIds.map(id =>
        window.supabaseClient.from("profiles").select("id,name,first_name,last_name,role", { id })
    ));
    const profileNames = new Map();
    counterpartResults.forEach(result => {
        const profile = result.data?.[0];
        if (profile) {
            profileNames.set(String(profile.id), profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "User");
        }
    });
    const syncedProjects = (projectsResult.data || []).map(project => {
        const counterpartName = profileNames.get(String(isClient ? project.freelancer_id : project.client_id)) || "User";
        const currentName = currentUser?.name || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || "User";
        return normalizeProjectRecord({
            ...project,
            client_name: isClient ? currentName : counterpartName,
            freelancer_name: isClient ? counterpartName : currentName
        });
    });

    let proposals = [];
    let relevantJobIds = [];
    if (isClient) {
        const jobsResult = await window.supabaseClient.from("jobs").select("id,title,client_id", { client_id: String(userId) });
        if (jobsResult.error) return { success: false, error: jobsResult.error };
        const jobsById = new Map((jobsResult.data || []).map(job => [String(job.id), job]));
        relevantJobIds = [...jobsById.keys()];
        const proposalResults = await Promise.all(relevantJobIds.map(jobId =>
            window.supabaseClient.from("proposals").select("*", { job_id: jobId })
        ));
        const failedProposalResult = proposalResults.find(result => result.error);
        if (failedProposalResult) return { success: false, error: failedProposalResult.error };
        proposals = proposalResults.flatMap(result => result.data || []).map(proposal => {
            const job = jobsById.get(String(proposal.job_id));
            return normalizeProposalRecord({ ...proposal, job_title: job?.title || "Job Proposal", client_id: userId, cloudConfirmed: true });
        });
    } else {
        const proposalsResult = await window.supabaseClient.from("proposals").select("*", { [proposalOwnerColumn]: String(userId) });
        if (proposalsResult.error) return { success: false, error: proposalsResult.error };
        const jobs = getStoredJobs();
        const jobsById = new Map(jobs.map(job => [String(job.id), job]));
        proposals = (proposalsResult.data || []).map(proposal => {
            const job = jobsById.get(String(proposal.job_id));
            return normalizeProposalRecord({ ...proposal, job_title: job?.title || "Job Proposal", cloudConfirmed: true });
        });
    }

    const storedProposals = getStoredProposals();
    const storedJobIds = new Set(getStoredJobs().map(job => String(job.id)));
    const confirmedLocalProposals = storedProposals.filter(proposal =>
        proposal.cloudConfirmed &&
        storedJobIds.has(String(proposal.jobId)) &&
        (isClient
            ? relevantJobIds.includes(String(proposal.jobId))
            : String(proposal.freelancerId) === String(userId))
    );
    const existingProposals = storedProposals.filter(proposal => {
        if (isClient) return !relevantJobIds.includes(String(proposal.jobId));
        return String(proposal.freelancerId) !== String(userId);
    });
    saveStoredProposals(mergeProposalRecords([...existingProposals, ...confirmedLocalProposals], proposals));

    const existingProjects = getStoredProjects().filter(project => String(project[isClient ? "clientId" : "freelancerId"]) !== String(userId));
    saveStoredProjects([...existingProjects, ...syncedProjects]);

    const existingTransactions = getStoredTransactions().filter(transaction => String(transaction.userId) !== String(userId));
    saveStoredTransactions([...existingTransactions, ...(transactionsResult.data || []).map(normalizeTransactionRecord)]);

    return { success: true, proposalsCount: proposals.length, projectsCount: projectsResult.data.length, transactionsCount: transactionsResult.data.length };
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
        const [{ data: cloudJobs, error: jobsErr }, { data: cloudProfiles, error: profilesErr }] = await Promise.all([
            supabaseClient.from("jobs").select(),
            supabaseClient.from("profiles").select()
        ]);

        if (jobsErr) return { success: false, error: jobsErr };
        if (!Array.isArray(cloudJobs)) return { success: false, error: new Error("Cloud jobs response was invalid") };

        saveStoredJobs(cloudJobs);
        if (!profilesErr && Array.isArray(cloudProfiles)) {
            saveStoredFreelancers(cloudProfiles.filter(profile => profile.role === "freelancer"));
        }

        return { success: true, cloudJobsCount: cloudJobs.length };
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
window.saveStoredProposals = saveStoredProposals;
window.createProposalRecord = createProposalRecord;
window.acceptProposalRecord = acceptProposalRecord;
window.getStoredProjects = getStoredProjects;
window.saveStoredProjects = saveStoredProjects;
window.getStoredTransactions = getStoredTransactions;
window.syncFromCloudDatabase = syncFromCloudDatabase;
window.syncAccountWorkData = syncAccountWorkData;
window.saveStoredTransactions = saveStoredTransactions;
window.getStoredMessages = getStoredMessages;
window.saveStoredMessages = saveStoredMessages;
window.syncFromCloudDatabase = syncFromCloudDatabase;
