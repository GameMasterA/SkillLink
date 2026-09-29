/**
 * SkillLink — Marketplace Core Engine (js/jobs.js)
 * Controls job search, dynamic category strip, multi-filter logic, saved job state, and proposal modal applications.
 */

let activeCategoryFilter = "All";
let currentDetailJobId = null;

// Category SVG Icons Definition
const CATEGORY_SVGS = {
    "All": `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
    "Web Development": `<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    "UI/UX Design": `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
    "Graphic Design": `<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    "Writing": `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    "Marketing": `<svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
};

document.addEventListener("DOMContentLoaded", () => {
    renderCategoryStrip();
    initJobsMarketplace();
    initJobDetailsView();
    initFreelancersMarketplace();
    initFreelancerProfileView();
});

/* Category Strip Pills */
function renderCategoryStrip() {
    const container = document.getElementById("categoriesContainer");
    if (!container) return;

    const categories = [
        { name: "All", iconSvg: CATEGORY_SVGS["All"], count: getStoredJobs().length },
        { name: "Web Development", iconSvg: CATEGORY_SVGS["Web Development"], count: getStoredJobs().filter(j => j.category === "Web Development").length },
        { name: "UI/UX Design", iconSvg: CATEGORY_SVGS["UI/UX Design"], count: getStoredJobs().filter(j => j.category === "UI/UX Design").length },
        { name: "Graphic Design", iconSvg: CATEGORY_SVGS["Graphic Design"], count: getStoredJobs().filter(j => j.category === "Graphic Design").length },
        { name: "Writing", iconSvg: CATEGORY_SVGS["Writing"], count: getStoredJobs().filter(j => j.category === "Writing").length },
        { name: "Marketing", iconSvg: CATEGORY_SVGS["Marketing"], count: getStoredJobs().filter(j => j.category === "Marketing").length }
    ];

    container.innerHTML = categories.map(cat => `
        <div class="category-card ${activeCategoryFilter === cat.name ? 'active' : ''}" onclick="selectCategory('${cat.name}')">
            <span class="cat-icon">${cat.iconSvg}</span>
            <span>${cat.name}</span>
            <span class="cat-count">${cat.count}</span>
        </div>
    `).join("");
}

function selectCategory(catName) {
    activeCategoryFilter = activeCategoryFilter === catName ? "All" : catName;
    const catSelect = document.getElementById("categoryFilter");
    if (catSelect) catSelect.value = activeCategoryFilter;
    renderCategoryStrip();
    filterAndRenderJobs();
}

/* Jobs Marketplace Controller */
function initJobsMarketplace() {
    const jobsList = document.getElementById("jobsList");
    if (!jobsList) return;

    document.getElementById("searchInput")?.addEventListener("input", filterAndRenderJobs);
    document.getElementById("categoryFilter")?.addEventListener("change", (e) => {
        activeCategoryFilter = e.target.value;
        renderCategoryStrip();
        filterAndRenderJobs();
    });
    document.getElementById("budgetFilter")?.addEventListener("change", filterAndRenderJobs);
    document.getElementById("experienceFilter")?.addEventListener("change", filterAndRenderJobs);
    document.getElementById("typeFilter")?.addEventListener("change", filterAndRenderJobs);
    document.getElementById("sortFilter")?.addEventListener("change", filterAndRenderJobs);

    filterAndRenderJobs();
    if (typeof syncFromCloudDatabase === "function") {
        syncFromCloudDatabase().then(result => {
            if (!result.success) {
                console.warn("[SkillLink Jobs] Cloud marketplace refresh failed.", result.error || result.reason);
                return;
            }
            renderCategoryStrip();
            filterAndRenderJobs();
        });
    }
}

function filterAndRenderJobs() {
    const jobsList = document.getElementById("jobsList");
    if (!jobsList) return;

    let jobs = getStoredJobs().filter(j => j.status === "open");
    const savedIds = getSavedJobIds();

    const searchQuery = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
    const budget = document.getElementById("budgetFilter")?.value || "All";
    const experience = document.getElementById("experienceFilter")?.value || "All";
    const type = document.getElementById("typeFilter")?.value || "All";
    const sortBy = document.getElementById("sortFilter")?.value || "newest";

    if (searchQuery) {
        jobs = jobs.filter(j => 
            j.title.toLowerCase().includes(searchQuery) ||
            j.description.toLowerCase().includes(searchQuery) ||
            j.category.toLowerCase().includes(searchQuery) ||
            (j.skills && j.skills.some(s => s.toLowerCase().includes(searchQuery)))
        );
    }

    if (activeCategoryFilter !== "All") {
        jobs = jobs.filter(j => j.category === activeCategoryFilter);
    }

    if (budget !== "All") {
        if (budget === "0-50000") jobs = jobs.filter(j => j.budgetMax <= 50000);
        else if (budget === "50000-100000") jobs = jobs.filter(j => j.budgetMin >= 50000 && j.budgetMax <= 100000);
        else if (budget === "100000-250000") jobs = jobs.filter(j => j.budgetMin >= 100000 && j.budgetMax <= 250000);
        else if (budget === "250000-plus") jobs = jobs.filter(j => j.budgetMax >= 250000);
    }

    if (experience !== "All") jobs = jobs.filter(j => j.experience === experience);
    if (type !== "All") jobs = jobs.filter(j => j.type === type);

    if (sortBy === "newest") jobs.sort((a, b) => b.postedTimestamp - a.postedTimestamp);
    else if (sortBy === "budget-high") jobs.sort((a, b) => b.budgetMax - a.budgetMax);
    else if (sortBy === "budget-low") jobs.sort((a, b) => a.budgetMin - b.budgetMin);
    else if (sortBy === "proposals") jobs.sort((a, b) => b.proposalsCount - a.proposalsCount);

    const countElem = document.getElementById("resultsCount");
    if (countElem) countElem.textContent = `${jobs.length} jobs available`;

    if (jobs.length === 0) {
        jobsList.innerHTML = `<div class="job-glass-card"><p style="color:var(--text-muted);">No matching jobs found.</p></div>`;
        return;
    }

    jobsList.innerHTML = jobs.map(job => {
        const isSaved = savedIds.includes(job.id);
        const formattedBudget = typeof formatCurrency === "function" ? `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}` : `₦${job.budgetMin} – ₦${job.budgetMax}`;

        const heartIcon = isSaved ? `
            <svg class="svg-icon" viewBox="0 0 24 24" style="fill:var(--accent-rose); stroke:var(--accent-rose); width:16px; height:16px;">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        ` : `
            <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        `;

        return `
            <article class="job-glass-card">
                <div class="job-card-top">
                    <div>
                        <a href="job-details.html?id=${job.id}" class="job-title">${job.title}</a>
                        <p class="job-summary" style="margin-top:4px;">${job.summary || job.description.substring(0, 120) + "..."}</p>
                    </div>
                    <span class="job-budget">${formattedBudget}</span>
                </div>
                <div class="skill-tags">
                    ${(job.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
                </div>
                <div class="job-card-footer">
                    <span>${job.postedAgo || 'Recently'} • ${job.proposalsCount || 0} proposals</span>
                    <div style="display:flex; gap:16px; align-items:center;">
                        <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="handleToggleSave('${job.id}')">
                            ${heartIcon} <span>${isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                        <a href="job-details.html?id=${job.id}" class="btn btn-primary btn-sm">
                            <span>View Job</span>
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function handleToggleSave(jobId) {
    const isNowSaved = toggleSaveJob(jobId);
    if (typeof showToast === "function") {
        showToast(isNowSaved ? "Job saved to your list." : "Job removed from saved list.");
    }
    filterAndRenderJobs();
}

/* Single Job Details View */
function initJobDetailsView() {
    const card = document.getElementById("jobDetailCard");
    if (!card) return;

    const params = new URLSearchParams(window.location.search);
    currentDetailJobId = params.get("id");

    const job = getStoredJobs().find(j => j.id === currentDetailJobId);
    if (!job) {
        card.innerHTML = "<h2>Job details not found</h2>";
        return;
    }

    const savedIds = getSavedJobIds();
    const isSaved = savedIds.includes(job.id);
    const formattedBudget = typeof formatCurrency === "function" ? `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}` : `₦${job.budgetMin} – ₦${job.budgetMax}`;

    const heartIcon = isSaved ? `
        <svg class="svg-icon" viewBox="0 0 24 24" style="fill:var(--accent-rose); stroke:var(--accent-rose); width:16px; height:16px;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    ` : `
        <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    `;

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div>
                <span class="badge" style="margin-bottom: 8px;">${job.category}</span>
                <h1 style="font-size: 26px; color: var(--text-dark); margin-top: 4px;">${job.title}</h1>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Posted by ${job.client?.name || "Client"}</p>
            </div>
            <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="handleToggleSaveDetail('${job.id}')" style="font-size:15px; padding:8px 16px; background:rgba(255,255,255,0.6); border-radius:12px; border:1px solid var(--glass-border);">
                ${heartIcon} <span>${isSaved ? 'Saved Job' : 'Save Job'}</span>
            </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:16px; margin:24px 0; padding:18px; background:rgba(255,255,255,0.45); border-radius:16px; border: 1px solid var(--glass-border);">
            <div>
                <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Budget</span>
                <p style="font-weight:700; color:var(--primary); font-size:16px; margin-top:2px;">${formattedBudget}</p>
            </div>
            <div>
                <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Delivery Estimate</span>
                <p style="font-weight:700; color:var(--text-dark); font-size:16px; margin-top:2px;">${job.duration || "N/A"}</p>
            </div>
            <div>
                <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Experience Required</span>
                <p style="font-weight:700; color:var(--text-dark); font-size:16px; margin-top:2px;">${job.experience || "N/A"}</p>
            </div>
        </div>

        <h3 style="font-size:16px; color:var(--text-dark);">Scope of Work</h3>
        <p style="color:var(--text-muted); line-height:1.6; margin-top:8px;">${job.description}</p>

        <h3 style="font-size:16px; color:var(--text-dark); margin-top:24px;">Required Skills & Competencies</h3>
        <div class="skill-tags" style="margin-top:8px;">
            ${(job.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
        </div>

        <div style="margin-top:32px; padding-top:20px; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
                <strong style="color:var(--text-dark);">Client: ${job.client?.name || "Client"}</strong>
                <p style="font-size:13px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-top:2px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; fill:#f59e0b; stroke:#f59e0b;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>${job.client?.rating || "5.0"}</span> • <span>${job.client?.jobsPosted || 0} jobs posted</span>
                </p>
            </div>
            <button class="btn btn-primary" onclick="openProposalModal()" style="padding:12px 28px;">Apply for this job</button>
        </div>
    `;

    document.getElementById("proposalForm")?.addEventListener("submit", handleProposalSubmit);
}

function handleToggleSaveDetail(jobId) {
    toggleSaveJob(jobId);
    initJobDetailsView();
}

function openProposalModal() {
    if (typeof openModal === "function") {
        openModal("proposalModal");
    } else {
        const modal = document.getElementById("proposalModal");
        if (modal) modal.classList.add("active");
    }
}

function closeProposalModal() {
    if (typeof closeModal === "function") {
        closeModal("proposalModal");
    } else {
        const modal = document.getElementById("proposalModal");
        if (modal) modal.classList.remove("active");
    }
}

function handleProposalSubmit(e) {
    e.preventDefault();

    if (!currentDetailJobId) return;

    const activeUser = typeof getCurrentUser === "function" ? getCurrentUser() : JSON.parse(localStorage.getItem("skillLinkUser"));
    if (!activeUser || !activeUser.id) {
        if (typeof showToast === "function") {
            showToast("Please sign in before submitting a proposal.", "error");
        }
        return;
    }

    const currentUserId = activeUser.id;
    const currentUserName = activeUser.name || [activeUser.firstName, activeUser.lastName].filter(Boolean).join(" ") || "User";

    const proposal = {
        id: "prop-" + Date.now(),
        jobId: currentDetailJobId,
        freelancerId: currentUserId,
        freelancerName: currentUserName,
        coverLetter: document.getElementById("coverLetterInput")?.value || "",
        bidAmount: Number(document.getElementById("bidAmountInput")?.value || 0),
        estimatedDuration: document.getElementById("durationInput")?.value || "1 week",
        status: "pending",
        submittedDate: new Date().toISOString().split("T")[0]
    };

    if (typeof addProposal === "function") {
        addProposal(proposal);
    } else {
        const props = JSON.parse(localStorage.getItem("skillLinkProposals") || "[]");
        props.push(proposal);
        localStorage.setItem("skillLinkProposals", JSON.stringify(props));
    }

    closeProposalModal();
    if (typeof showToast === "function") {
        showToast("Proposal submitted successfully!", "success");
    }
}

/* Freelancers Directory & Profile View */
function initFreelancersMarketplace() {
    const list = document.getElementById("freelancersList");
    if (!list) return;

    const freelancers = typeof getStoredFreelancers === "function" ? getStoredFreelancers() : [];
    const escapeForJs = (value = "") => String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\"/g, '\\"');
    
    list.innerHTML = freelancers.map(fl => `
        <div class="glass-card" style="padding: 28px; text-align: center;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--accent-blue) 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; margin: 0 auto 16px; box-shadow: 0 8px 20px rgba(2, 132, 199, 0.3);">
                ${fl.name.charAt(0)}
            </div>
            <h3 style="font-size: 1.2rem; color: var(--text-dark);">${fl.name}</h3>
            <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-top: 2px;">${fl.title || "Top Rated Specialist"}</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">${fl.bio || "Dedicated freelance expert delivering high precision work."}</p>
            
            <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin:16px 0; font-size:0.85rem; color:var(--text-muted);">
                <span style="display:flex; align-items:center; gap:4px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; fill:#f59e0b; stroke:#f59e0b;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <strong>${fl.rating || "5.0"}</strong>
                </span>
                <span>•</span>
                <span>${fl.completedJobs || 12} projects</span>
            </div>

            <button type="button" class="btn btn-primary btn-sm" onclick="openConversationWithUser('${escapeForJs(fl.id)}', '${escapeForJs(fl.name)}')" style="width: 100%; margin-bottom: 10px;">Message</button>
            <a href="freelancer-profile.html?id=${fl.id}" class="btn btn-outline btn-sm" style="width: 100%;">View Profile</a>
        </div>
    `).join("");
}

function renderFreelancerMessageActions(fl) {
    if (!fl) return "";
    const escapeForJs = (value = "") => String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\"/g, '\\"');

    return `
        <div style="margin-top: 24px; display:flex; flex-wrap:wrap; gap:12px;">
            <button type="button" class="btn btn-primary" onclick="openConversationWithUser('${escapeForJs(fl.id)}', '${escapeForJs(fl.name)}')">Message ${escapeForJs(fl.name || "Freelancer")}</button>
            <a href="freelancers.html" class="btn btn-outline">Back to Directory</a>
        </div>
    `;
}

function initFreelancerProfileView() {
    const card = document.getElementById("freelancerProfileCard");
    if (!card) return;

    const params = new URLSearchParams(window.location.search);
    const flId = params.get("id");
    const freelancers = typeof getStoredFreelancers === "function" ? getStoredFreelancers() : [];
    const fl = freelancers.find(f => f.id === flId) || freelancers[0];

    if (!fl) return;

    card.innerHTML = `
        <div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap;">
            <div style="width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--accent-blue) 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; box-shadow: 0 10px 25px rgba(2, 132, 199, 0.35);">
                ${fl.name.charAt(0)}
            </div>
            <div>
                <h1 style="font-size: 1.8rem; color: var(--text-dark);">${fl.name}</h1>
                <p style="color: var(--primary); font-weight: 600; font-size: 1.05rem;">${fl.title || "Full Stack Professional"}</p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; display:flex; align-items:center; gap:8px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; fill:#f59e0b; stroke:#f59e0b;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>${fl.rating || "5.0"} rating</span> • <span>${fl.completedJobs || 24} jobs completed</span>
                </p>
            </div>
        </div>

        <div style="margin-top:28px;">
            <h3 style="font-size:1.1rem; color:var(--text-dark); margin-bottom:8px;">About</h3>
            <p style="color:var(--text-muted); line-height:1.6;">${fl.bio || "Experienced specialist with a strong background in developing scalable applications and user experiences."}</p>
        </div>

        <div style="margin-top:24px;">
            <h3 style="font-size:1.1rem; color:var(--text-dark); margin-bottom:10px;">Core Skills</h3>
            <div class="skill-tags">
                ${(fl.skills || ["JavaScript", "HTML/CSS", "UI Design"]).map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
        </div>

        ${renderFreelancerMessageActions(fl)}
    `;
}