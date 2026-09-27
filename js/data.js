/**
 * SkillLink Central Marketplace Database Layer
 * Stores and manages seed datasets (Jobs, Freelancers, Categories, Proposals, Projects, Messages, Transactions)
 * and syncs with LocalStorage.
 */

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

const SEED_CATEGORIES = [
    { id: "cat-1", name: "Web Development", count: 124, icon: "💻" },
    { id: "cat-2", name: "UI/UX Design", count: 86, icon: "🎨" },
    { id: "cat-3", name: "Graphic Design", count: 62, icon: "◈" },
    { id: "cat-4", name: "Writing", count: 45, icon: "✎" },
    { id: "cat-5", name: "Marketing", count: 38, icon: "⇡" },
    { id: "cat-6", name: "Video Editing", count: 29, icon: "►" }
];

const SEED_JOBS = [
    {
        id: "job-101",
        title: "Frontend Developer for SaaS Landing Portal",
        summary: "Build a responsive business portal using modern HTML, CSS, and clean vanilla JS with sky-blue glassmorphism theme.",
        description: "We are seeking a skilled Frontend Developer to build a responsive marketing site and client landing portal. Must write semantic, maintainable code without heavy frameworks. Deliverables include interactive hero, pricing tables, contact forms, and mobile navigation.",
        category: "Web Development",
        budgetMin: 80000,
        budgetMax: 150000,
        experience: "Intermediate",
        type: "Fixed Price",
        duration: "10 days",
        postedAgo: "Posted 2 hours ago",
        postedTimestamp: Date.now() - 7200000,
        proposalsCount: 8,
        skills: ["HTML5", "CSS3", "JavaScript", "Responsive Design"],
        status: "open",
        clientId: "usr-demo-cl",
        client: {
            id: "usr-demo-cl",
            name: "Sarah Miller",
            company: "Apex Tech Ventures",
            rating: 4.9,
            jobsPosted: 12,
            projectsCompleted: 9
        }
    },
    {
        id: "job-102",
        title: "SaaS Dashboard UI/UX Design System",
        summary: "Design translucent UI components and workflow wireframes in Figma for analytics software.",
        description: "Looking for an expert UI/UX designer to craft a high-fidelity design system for our cloud analytics SaaS platform. Experience with dark/light sky-blue glass themes and micro-interactions preferred.",
        category: "UI/UX Design",
        budgetMin: 180000,
        budgetMax: 300000,
        experience: "Expert",
        type: "Fixed Price",
        duration: "14 days",
        postedAgo: "Posted 5 hours ago",
        postedTimestamp: Date.now() - 18000000,
        proposalsCount: 14,
        skills: ["Figma", "UI/UX Design", "Wireframing", "Prototyping"],
        status: "open",
        clientId: "client-2",
        client: {
            id: "client-2",
            name: "David K.",
            company: "CloudScale Inc",
            rating: 4.8,
            jobsPosted: 24,
            projectsCompleted: 21
        }
    },
    {
        id: "job-103",
        title: "Brand Identity & Vector Logo Package",
        summary: "Craft a modern tech logo, minimalist color guidelines, and social media vector assets.",
        description: "Need a talented graphic designer to create a complete visual identity kit for a new fintech product launch. Deliverables include vector logos, brand books, and social media templates.",
        category: "Graphic Design",
        budgetMin: 40000,
        budgetMax: 90000,
        experience: "Beginner",
        type: "Fixed Price",
        duration: "5 days",
        postedAgo: "Posted 1 day ago",
        postedTimestamp: Date.now() - 86400000,
        proposalsCount: 5,
        skills: ["Graphic Design", "Logo Design", "Illustrator"],
        status: "open",
        clientId: "client-3",
        client: {
            id: "client-3",
            name: "Elena R.",
            company: "FinFlow Studios",
            rating: 4.7,
            jobsPosted: 6,
            projectsCompleted: 5
        }
    },
    {
        id: "job-104",
        title: "Technical Writer for REST & GraphQL API Portals",
        summary: "Write comprehensive developer documentation and API quickstart guides.",
        description: "Seeking a clear technical writer to document our REST and GraphQL APIs. Must be able to distill complex code samples into intuitive guides for developer portals.",
        category: "Writing",
        budgetMin: 60000,
        budgetMax: 110000,
        experience: "Intermediate",
        type: "Hourly",
        duration: "3 weeks",
        postedAgo: "Posted 2 days ago",
        postedTimestamp: Date.now() - 172800000,
        proposalsCount: 3,
        skills: ["Writing", "API Documentation", "Markdown", "Developer Relations"],
        status: "open",
        clientId: "client-4",
        client: {
            id: "client-4",
            name: "Marcus T.",
            company: "DevHub Systems",
            rating: 5.0,
            jobsPosted: 18,
            projectsCompleted: 18
        }
    }
];

const SEED_FREELANCERS = [
    {
        id: "usr-demo-fl",
        name: "John Doe",
        title: "Frontend Developer & UI Specialist",
        rating: 4.9,
        reviewsCount: 32,
        completedJobs: 28,
        startingPrice: 50000,
        category: "Web Development",
        bio: "I build clean, high-performance, and responsive websites for growing businesses and tech startups using modern HTML, CSS, and vanilla JS.",
        skills: ["HTML", "CSS", "JavaScript", "Responsive Design", "UI Design"],
        availability: "Available Now",
        email: "freelancer@skilllink.com",
        photo: "assets/images/freelancer-1.jpg",
        portfolio: [
            { title: "Fintech Analytics Dashboard", category: "Web Development", description: "Glassmorphic financial analytics platform dashboard." },
            { title: "E-Commerce Checkout Workflow", category: "Web Development", description: "Responsive online store landing page and cart workflow." }
        ],
        reviews: [
            { reviewerName: "Sarah Miller", comment: "Exceptional code quality and super fast turnaround! High visual standards.", rating: 5.0, date: "2026-02-20" },
            { reviewerName: "David K.", comment: "Communicated well and delivered a spotless UI.", rating: 4.8, date: "2026-01-14" }
        ]
    },
    {
        id: "fl-2",
        name: "Amina Bello",
        title: "Lead UI/UX & Product Designer",
        rating: 5.0,
        reviewsCount: 41,
        completedJobs: 39,
        startingPrice: 75000,
        category: "UI/UX Design",
        bio: "Designing clean, human-centered digital interfaces with modern glassmorphism and intuitive user flows.",
        skills: ["Figma", "UI/UX Design", "Prototyping", "Wireframing"],
        availability: "Available Next Week",
        email: "amina@skilllink.com",
        photo: "assets/images/freelancer-2.jpg",
        portfolio: [
            { title: "Healthcare Mobile App", category: "UI/UX Design", description: "Patient portal design system." }
        ],
        reviews: [
            { reviewerName: "Marcus T.", comment: "Amina's designs elevated our software instantly.", rating: 5.0, date: "2026-02-01" }
        ]
    }
];

const SEED_PROPOSALS = [
    {
        id: "prop-1",
        jobId: "job-101",
        jobTitle: "Frontend Developer for SaaS Landing Portal",
        clientName: "Sarah Miller",
        clientId: "usr-demo-cl",
        freelancerId: "usr-demo-fl",
        freelancerName: "John Doe",
        bidAmount: 120000,
        deliveryDays: 7,
        coverLetter: "Hi Sarah! I have extensively worked with responsive glassmorphic layouts and vanilla JavaScript. I can complete your SaaS landing portal within 7 days with pixel-perfect responsive execution.",
        status: "accepted",
        createdAt: "2026-03-01T10:00:00.000Z"
    }
];

const SEED_PROJECTS = [
    {
        id: "proj-1",
        jobId: "job-101",
        jobTitle: "Frontend Developer for SaaS Landing Portal",
        clientName: "Sarah Miller",
        clientId: "usr-demo-cl",
        freelancerId: "usr-demo-fl",
        freelancerName: "John Doe",
        budget: 120000,
        status: "active",
        progress: 65,
        startDate: "2026-03-02",
        dueDate: "2026-03-12"
    }
];

const SEED_TRANSACTIONS = [
    {
        id: "tx-1",
        userId: "usr-demo-fl",
        type: "earning",
        title: "Payment Received — Corporate Website Re-design",
        amount: 180000,
        date: "2026-01-26",
        status: "completed"
    },
    {
        id: "tx-2",
        userId: "usr-demo-fl",
        type: "withdrawal",
        title: "Bank Withdrawal — GTBank (***4821)",
        amount: 150000,
        date: "2026-02-01",
        status: "completed"
    }
];

const SEED_MESSAGES = [
    {
        conversationId: "conv-1",
        participants: [
            { id: "usr-demo-fl", name: "John Doe", role: "freelancer" },
            { id: "usr-demo-cl", name: "Sarah Miller", role: "client" }
        ],
        lastMessage: "Sounds great! Let me review the landing portal hero section.",
        lastTimestamp: "10:45 AM",
        messages: [
            { id: "m-1", senderId: "usr-demo-cl", text: "Hello John! Thanks for accepting the SaaS Landing Portal contract.", timestamp: "Yesterday 09:00 AM" },
            { id: "m-2", senderId: "usr-demo-fl", text: "Hi Sarah! Glad to work on this. I've already set up the glassmorphism header and responsive grid layout.", timestamp: "Yesterday 09:15 AM" },
            { id: "m-3", senderId: "usr-demo-cl", text: "Sounds great! Let me review the landing portal hero section.", timestamp: "10:45 AM" }
        ]
    }
];

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

    Object.entries(blankStore).forEach(([key, value]) => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });
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
        clientId: job.clientId || job.client_id || "usr-demo-cl",
        client: job.client || {
            id: job.clientId || job.client_id || "usr-demo-cl",
            name: job.client_name || "Client",
            rating: 4.9,
            jobsPosted: 1
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

function getStoredFreelancers() {
    initMarketplaceData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FREELANCERS)) || [];
}

function saveStoredFreelancers(freelancers) {
    localStorage.setItem(STORAGE_KEYS.FREELANCERS, JSON.stringify(freelancers));
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
    const normalizedJob = normalizeJobRecord(jobRecord);
    const localJobs = getStoredJobs();
    const payload = {
        ...normalizedJob,
        client_id: normalizedJob.clientId,
        client_name: normalizedJob.client?.name || "Client",
        budget_min: normalizedJob.budgetMin,
        budget_max: normalizedJob.budgetMax,
        proposals_count: normalizedJob.proposalsCount,
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
        ...nextJob,
        client_id: nextJob.clientId,
        client_name: nextJob.client?.name || "Client",
        budget_min: nextJob.budgetMin,
        budget_max: nextJob.budgetMax,
        proposals_count: nextJob.proposalsCount
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