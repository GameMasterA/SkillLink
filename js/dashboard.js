/**
 * SkillLink — Central Dashboard System Engine (js/dashboard.js)
 * Controls sidebar navigation toggles, stats counters, contract trackers, job post submission, and admin control panels.
 */

document.addEventListener("DOMContentLoaded", () => {
    initDashboardCore();
});

function escapeDashboardText(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function initDashboardCore() {
    setupSidebarToggle();
    renderUserData();

    initFreelancerDashboard();
    initClientDashboard();
    initAdminDashboard();
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById("sidebarToggle") || document.getElementById("mobileNavToggle");
    const sidebar = document.getElementById("sidebar");

    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay && sidebar) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            if (overlay) overlay.classList.toggle("active");
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        });
    }
}

function renderUserData() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) return;

    const nameLabels = document.querySelectorAll(".user-display-name");
    nameLabels.forEach(el => {
        el.textContent = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "User";
    });

    const roleLabels = document.querySelectorAll(".user-display-role");
    roleLabels.forEach(el => {
        el.textContent = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "User";
    });

    const avatarLabels = document.querySelectorAll(".user-avatar-initial");
    avatarLabels.forEach(el => {
        const char = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : "U");
        el.textContent = char.toUpperCase();
    });
}

/**
 * FREELANCER DASHBOARD ENGINE
 */
function initFreelancerDashboard() {
    const isFreelancerDash = document.getElementById("freelancerDashboardRoot");
    if (!isFreelancerDash) return;

    if (typeof enforceRoleAccess === "function") {
        enforceRoleAccess("freelancer");
    }

    renderFreelancerStats();
    renderFreelancerActiveProjects();
    renderFreelancerProposalsTable();
    renderFreelancerEarningsSummary();
    if (typeof syncAccountWorkData === "function") {
        syncAccountWorkData(getCurrentUser()?.id, "freelancer").then(result => {
            if (result.success) {
                renderFreelancerStats();
                renderFreelancerActiveProjects();
                renderFreelancerProposalsTable();
                renderFreelancerEarningsSummary();
            }
        });
    }
}

function renderFreelancerStats() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        const zeroElems = [
            document.getElementById("statTotalEarnings"),
            document.getElementById("statActiveProjects"),
            document.getElementById("statSubmittedProposals"),
            document.getElementById("statCompletedJobs")
        ];
        zeroElems.forEach(el => { if (el) el.textContent = "₦0"; });
        return;
    }

    const projects = typeof getStoredProjects === "function" ? getStoredProjects() : [];
    const proposals = typeof getStoredProposals === "function" ? getStoredProposals() : [];
    const transactions = typeof getStoredTransactions === "function" ? getStoredTransactions() : [];

    const activeProjects = projects.filter(p => String(p.freelancerId) === String(userId) && ["pending", "in_progress", "review", "active"].includes(p.status));
    const completedProjects = projects.filter(p => p.freelancerId === userId && p.status === "completed");
    const myProposals = proposals.filter(p => String(p.freelancerId) === String(userId));
    const totalEarnings = transactions
        .filter(t => String(t.userId) === String(userId) && ["payment", "escrow_release"].includes(t.type) && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalWithdrawn = transactions
        .filter(t => String(t.userId) === String(userId) && t.type === "withdrawal" && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const escrowBalance = transactions
        .filter(t => String(t.userId) === String(userId) && t.type === "escrow_hold" && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) - transactions
        .filter(t => String(t.userId) === String(userId) && t.type === "escrow_release" && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const elemEarnings = document.getElementById("statTotalEarnings");
    if (elemEarnings) elemEarnings.textContent = typeof formatCurrency === "function" ? formatCurrency(totalEarnings) : `₦${totalEarnings.toLocaleString()}`;
    const availableBalanceElement = document.getElementById("statAvailableBalance");
    const availableBalance = Math.max(0, totalEarnings - totalWithdrawn - Math.max(0, escrowBalance));
    if (availableBalanceElement) availableBalanceElement.textContent = typeof formatCurrency === "function" ? formatCurrency(availableBalance) : `₦${availableBalance.toLocaleString()}`;

    const elemActive = document.getElementById("statActiveProjects");
    if (elemActive) elemActive.textContent = activeProjects.length;

    const elemProp = document.getElementById("statSubmittedProposals");
    if (elemProp) elemProp.textContent = myProposals.length;

    const elemComp = document.getElementById("statCompletedJobs");
    if (elemComp) elemComp.textContent = completedProjects.length;
}

function renderFreelancerActiveProjects() {
    const container = document.getElementById("freelancerActiveProjectsList");
    if (!container) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        container.innerHTML = `
            <div class="glass-card" style="padding: 28px; text-align: center; border-radius: var(--radius-lg);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(2,132,199,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 4px;">No active contracts yet</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Sign in to view your active work, or explore open projects to get started.</p>
            </div>
        `;
        return;
    }

    const projects = typeof getStoredProjects === "function" ? getStoredProjects() : [];
    const active = projects.filter(project => String(project.freelancerId) === String(userId) && ["pending", "in_progress", "review", "active"].includes(project.status));

    if (active.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="padding: 28px; text-align: center; border-radius: var(--radius-lg);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(2,132,199,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 4px;">No active contracts yet</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Explore open job opportunities and submit proposals to get hired.</p>
                <a href="../jobs.html" class="btn btn-primary btn-sm">Browse Marketplace Jobs</a>
            </div>
        `;
        return;
    }

    container.innerHTML = active.map(p => `
        <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                    <h4 style="font-size:16px; color:var(--text-dark);">${p.jobTitle}</h4>
                    <p style="font-size:13px; color:var(--text-muted);">Client: ${p.clientName} • Started: ${p.startDate}</p>
                </div>
                <span class="status-indicator">${p.status.toUpperCase()}</span>
            </div>
            <div style="margin-top:16px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                    <span>Contract Deliverable Progress</span>
                    <span style="font-weight:700;">${p.progress}%</span>
                </div>
                <div style="width:100%; height:8px; background:rgba(0,0,0,0.08); border-radius:4px; overflow:hidden;">
                    <div style="width:${p.progress}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--accent-blue)); border-radius:4px;"></div>
                </div>
            </div>
        </div>
    `).join("");
}

function renderFreelancerProposalsTable() {
    const container = document.getElementById("freelancerProposalsTable");
    if (!container) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No proposals submitted yet.</td></tr>`;
        return;
    }

    const proposals = typeof getStoredProposals === "function" ? getStoredProposals() : [];
    const myProposals = proposals.filter(proposal => String(proposal.freelancerId) === String(userId));

    if (myProposals.length === 0) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No proposals submitted yet. <a href="../jobs.html" style="color:var(--primary); font-weight:600; text-decoration:none;">Find projects to apply</a></td></tr>`;
        return;
    }

    container.innerHTML = myProposals.map(p => `
        <tr>
            <td><strong>${escapeDashboardText(p.jobTitle || 'Job Proposal')}</strong></td>
            <td>${escapeDashboardText(p.clientName || 'Client')}</td>
            <td style="font-weight:700; color:var(--primary);">${typeof formatCurrency === "function" ? formatCurrency(p.bidAmount) : '₦' + Number(p.bidAmount || 0).toLocaleString()}</td>
            <td><span class="status-indicator">${escapeDashboardText(p.status || 'Pending')}</span></td>
            <td><a href="../job-details.html?id=${encodeURIComponent(p.jobId)}" class="btn btn-outline btn-sm">View Job</a></td>
        </tr>
    `).join("");
}

function renderFreelancerEarningsSummary() {
    const table = document.getElementById("freelancerTransactionsTable");
    if (!table) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        table.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No financial transactions yet.</td></tr>`;
        return;
    }

    const transactions = typeof getStoredTransactions === "function" ? getStoredTransactions() : [];
    const myTransactions = transactions.filter(transaction => String(transaction.userId) === String(userId));
    const completedWithdrawals = myTransactions
        .filter(transaction => transaction.type === "withdrawal" && transaction.status === "completed")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const activeEscrow = myTransactions
        .filter(transaction => transaction.type === "escrow_hold" && transaction.status === "completed")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0) - myTransactions
        .filter(transaction => transaction.type === "escrow_release" && transaction.status === "completed")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const withdrawnElement = document.getElementById("statTotalWithdrawn");
    if (withdrawnElement) withdrawnElement.textContent = typeof formatCurrency === "function" ? formatCurrency(completedWithdrawals) : `₦${completedWithdrawals.toLocaleString()}`;
    const escrowElement = document.getElementById("statEscrowBalance");
    if (escrowElement) escrowElement.textContent = typeof formatCurrency === "function" ? formatCurrency(Math.max(0, activeEscrow)) : `₦${Math.max(0, activeEscrow).toLocaleString()}`;
    const escrowCountElement = document.getElementById("statEscrowCount");
    if (escrowCountElement) escrowCountElement.textContent = `${getStoredProjects().filter(project => String(project.freelancerId) === String(userId) && ["pending", "in_progress", "review", "active"].includes(project.status)).length} Active Contracts`;

    if (myTransactions.length === 0) {
        table.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No financial transactions yet. Your completed milestone payments will appear here.</td></tr>`;
        return;
    }

    table.innerHTML = myTransactions.map(t => `
        <tr>
            <td><strong>${escapeDashboardText(t.title)}</strong></td>
            <td><span class="status-indicator">${escapeDashboardText(t.type.toUpperCase())}</span></td>
            <td>${escapeDashboardText(t.date)}</td>
            <td style="font-weight:700; color:${["payment", "escrow_release"].includes(t.type) ? 'var(--accent-emerald)' : 'var(--text-dark)'};">${typeof formatCurrency === "function" ? formatCurrency(t.amount) : '₦' + t.amount}</td>
            <td><span class="status-indicator">${escapeDashboardText(t.status)}</span></td>
        </tr>
    `).join("");
}

/**
 * CLIENT DASHBOARD ENGINE
 */
function initClientDashboard() {
    const isClientDash = document.getElementById("clientDashboardRoot");
    if (!isClientDash) return;

    if (typeof enforceRoleAccess === "function") {
        enforceRoleAccess("client");
    }

    renderClientStats();
    renderClientJobsTable();
    renderClientProposalsList();
    renderClientProjectsList();
    setupPostJobForm();
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (user?.id && typeof syncAccountWorkData === "function") {
        syncAccountWorkData(user.id, "client").then(result => {
            if (result.success) {
                renderClientStats();
                renderClientJobsTable();
                renderClientProposalsList();
                renderClientProjectsList();
            }
        });

        const proposalsContainer = document.getElementById("clientProposalsList");
        if (proposalsContainer && proposalsContainer.dataset.refreshScheduled !== "true") {
            proposalsContainer.dataset.refreshScheduled = "true";
            const refreshClientProposals = () => {
                if (document.visibilityState !== "visible") return;
                syncAccountWorkData(user.id, "client").then(result => {
                    if (result.success) {
                        renderClientStats();
                        renderClientJobsTable();
                        renderClientProposalsList();
                    }
                }).catch(error => console.warn("[SkillLink Client] Proposal refresh failed.", error));
            };
            window.setInterval(refreshClientProposals, 10000);
            document.addEventListener("visibilitychange", refreshClientProposals);
        }
    }
}

function renderClientStats() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        const zeroFields = [
            document.getElementById("clientStatJobsPosted"),
            document.getElementById("clientStatOpenJobs"),
            document.getElementById("clientStatActiveProjects"),
            document.getElementById("clientStatProposalsReceived")
        ];
        zeroFields.forEach(el => { if (el) el.textContent = "0"; });
        return;
    }

    const jobs = typeof getStoredJobs === "function" ? getStoredJobs() : [];
    const proposals = typeof getStoredProposals === "function" ? getStoredProposals() : [];
    const projects = typeof getStoredProjects === "function" ? getStoredProjects() : [];

    const myJobs = jobs.filter(job => String(job.clientId) === String(userId));
    const myJobIds = new Set(myJobs.map(job => String(job.id)));
    const myProposals = proposals.filter(proposal => myJobIds.has(String(proposal.jobId)));
    const myProjects = projects.filter(project => String(project.clientId) === String(userId));

    const openJobs = myJobs.filter(j => j.status === "open");

    const elemJobs = document.getElementById("clientStatJobsPosted");
    if (elemJobs) elemJobs.textContent = myJobs.length;

    const elemOpen = document.getElementById("clientStatOpenJobs");
    if (elemOpen) elemOpen.textContent = openJobs.length;

    const elemProj = document.getElementById("clientStatActiveProjects");
    if (elemProj) elemProj.textContent = myProjects.filter(project => ["pending", "in_progress", "review", "active"].includes(project.status)).length;

    const elemProp = document.getElementById("clientStatProposalsReceived");
    if (elemProp) elemProp.textContent = myProposals.length;
}

function renderClientProposalsList() {
    const container = document.getElementById("clientProposalsList");
    if (!container) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const ownedJobs = getStoredJobs().filter(job => String(job.clientId) === String(user?.id));
    const jobsById = new Map(ownedJobs.map(job => [String(job.id), job]));
    const proposals = getStoredProposals().filter(proposal => jobsById.has(String(proposal.jobId)));

    if (!proposals.length) {
        container.innerHTML = `<div class="glass-card" style="padding:28px; text-align:center; border-radius:var(--radius-lg);">No proposals received yet. New applications for your jobs will appear here.</div>`;
        return;
    }

    container.innerHTML = proposals.map(proposal => {
        const job = jobsById.get(String(proposal.jobId));
        const status = String(proposal.status || "pending").toLowerCase();
        const canHire = status === "pending" && job?.status === "open";
        return `
            <article class="glass-card" style="padding:24px; border-radius:var(--radius-lg);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
                    <div>
                        <span class="badge">${escapeDashboardText(job?.title || proposal.jobTitle)}</span>
                        <h3 style="margin-top:10px;">${escapeDashboardText(proposal.freelancerName)}</h3>
                        <span class="status-indicator">${escapeDashboardText(status)}</span>
                    </div>
                    <div style="text-align:right;">
                        <strong>${typeof formatCurrency === "function" ? formatCurrency(proposal.bidAmount) : `₦${Number(proposal.bidAmount || 0).toLocaleString()}`}</strong>
                        <p>Delivery: ${escapeDashboardText(proposal.estimatedDuration)}</p>
                    </div>
                </div>
                <p style="white-space:pre-wrap; margin:18px 0;">${escapeDashboardText(proposal.coverLetter)}</p>
                <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-outline btn-sm" data-message-user="${escapeDashboardText(proposal.freelancerId)}" data-message-name="${escapeDashboardText(proposal.freelancerName)}">Message Applicant</button>
                    ${canHire ? `<button type="button" class="btn btn-primary btn-sm" data-accept-proposal="${escapeDashboardText(proposal.id)}">Hire Freelancer</button>` : ""}
                </div>
            </article>
        `;
    }).join("");

    container.querySelectorAll("[data-message-user]").forEach(button => {
        button.addEventListener("click", () => window.openConversationWithUser?.(button.dataset.messageUser, button.dataset.messageName));
    });
    container.querySelectorAll("[data-accept-proposal]").forEach(button => {
        button.addEventListener("click", () => acceptProposalFromClient(button.dataset.acceptProposal, button));
    });
}

async function acceptProposalFromClient(proposalId, button) {
    if (button) button.disabled = true;
    const result = await acceptProposalRecord(proposalId);
    if (!result.success) {
        if (button) button.disabled = false;
        if (typeof showToast === "function") showToast(result.error?.message || "Unable to hire this freelancer.", "error");
        return;
    }

    if (typeof showToast === "function") showToast("Freelancer hired and contract created.", "success");
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    await syncAccountWorkData(user?.id, "client");
    renderClientStats();
    renderClientProposalsList();
    renderClientProjectsList();
    renderClientJobsTable();
}

function renderClientProjectsList() {
    const container = document.getElementById("clientProjectsList");
    if (!container) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const projects = getStoredProjects().filter(project => String(project.clientId) === String(user?.id));
    if (!projects.length) {
        container.innerHTML = `<div class="glass-card" style="padding:28px; text-align:center; border-radius:var(--radius-lg);">No contracts yet. Hire a freelancer from a received proposal to create a contract.</div>`;
        return;
    }

    container.innerHTML = projects.map(project => `
        <article class="glass-card" style="padding:22px; border-radius:var(--radius-lg); margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                <div><h3>${escapeDashboardText(project.jobTitle)}</h3><p>Freelancer: ${escapeDashboardText(project.freelancerName)}</p></div>
                <div><strong>${typeof formatCurrency === "function" ? formatCurrency(project.amount) : `₦${Number(project.amount || 0).toLocaleString()}`}</strong><p class="status-indicator">${escapeDashboardText(project.status.replaceAll("_", " "))}</p></div>
            </div>
        </article>
    `).join("");
}

function renderClientJobsTable() {
    const table = document.getElementById("clientJobsTable");
    if (!table) return;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const userId = user ? user.id : null;

    if (!userId) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No jobs posted yet.</td></tr>`;
        return;
    }

    const jobs = typeof getStoredJobs === "function" ? getStoredJobs() : [];
    const myJobs = jobs.filter(job => String(job.clientId || job.client_id) === String(userId));

    if (myJobs.length === 0) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No jobs posted yet. <a href="post-job.html" style="color:var(--primary); font-weight:600; text-decoration:none;">Post your first job offer</a></td></tr>`;
        return;
    }

    table.innerHTML = myJobs.map(j => `
        <tr>
            <td><strong>${j.title}</strong></td>
            <td>${j.category}</td>
            <td style="font-weight:700; color:var(--primary);">${typeof formatCurrency === "function" ? formatCurrency(j.budgetMax || j.budget_max || 0) : '₦' + (j.budgetMax || j.budget_max || 0)}</td>
            <td>${j.proposalsCount || j.proposals_count || 0} applicants</td>
            <td><span class="status-indicator">${(j.status || "open").toUpperCase()}</span></td>
            <td>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" type="button" onclick="window.location.href='post-job.html?id=${encodeURIComponent(j.id)}'">Edit</button>
                    <button class="btn btn-outline btn-sm" type="button" onclick="deleteClientJob('${j.id}')" style="border-color: rgba(239,68,68,0.5); color: #dc2626;">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function setupPostJobForm() {
    const form = document.getElementById("postJobForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const editJobId = params.get("id");

    if (editJobId && typeof getStoredJobs === "function") {
        const currentJob = getStoredJobs().find(job => String(job.id) === String(editJobId));
        if (currentJob) {
            document.getElementById("jobTitle").value = currentJob.title || "";
            document.getElementById("jobCategory").value = currentJob.category || "Web Development";
            document.getElementById("budgetMin").value = currentJob.budgetMin ?? currentJob.budget_min ?? 0;
            document.getElementById("budgetMax").value = currentJob.budgetMax ?? currentJob.budget_max ?? 0;
            document.getElementById("jobSkills").value = (currentJob.skills || []).join(", ");
            document.getElementById("jobDescription").value = currentJob.description || "";
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = "Update Job Listing";
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
        const title = document.getElementById("jobTitle")?.value.trim();
        const category = document.getElementById("jobCategory")?.value;
        const budgetMin = Number(document.getElementById("budgetMin")?.value || 0);
        const budgetMax = Number(document.getElementById("budgetMax")?.value || 0);
        const description = document.getElementById("jobDescription")?.value.trim();
        const skillsRaw = document.getElementById("jobSkills")?.value || "";
        const skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);

        if (!title || !description || !category || budgetMin <= 0 || budgetMax <= 0) {
            if (typeof showToast === "function") {
                showToast("Please complete the form before publishing.", "error");
            }
            return;
        }

        const normalizedUser = user || { id: "local-client", name: "Client" };
        const jobPayload = {
            id: editJobId || `job-${Date.now()}`,
            title,
            summary: description.substring(0, 100) + "...",
            description,
            category,
            budgetMin,
            budgetMax,
            experience: "Intermediate",
            type: "Fixed Price",
            duration: "1-2 Weeks",
            postedAgo: "Just now",
            postedTimestamp: Date.now(),
            proposalsCount: 0,
            skills: skills.length > 0 ? skills : ["Web Development"],
            status: "open",
            clientId: normalizedUser.id,
            client: {
                id: normalizedUser.id,
                name: normalizedUser.name || "Client",
                rating: 4.9,
                jobsPosted: 1
            }
        };

        let result;
        if (editJobId) {
            result = await window.updateJobRecord(editJobId, jobPayload);
        } else {
            result = await window.createJobRecord(jobPayload);
        }

        if (result && result.success) {
            if (typeof showToast === "function") {
                showToast(editJobId ? "Job updated successfully." : "Job posted successfully! Live in marketplace.", "success");
            }
            setTimeout(() => {
                window.location.href = "my-jobs.html";
            }, 800);
            return;
        }

        if (typeof showToast === "function") {
            showToast(result?.error?.message || "Unable to save the job right now.", "error");
        }
    });
}

async function deleteClientJob(jobId) {
    if (!jobId) return;
    const confirmed = window.confirm("Delete this listing? This action cannot be undone.");
    if (!confirmed) return;

    const result = await window.deleteJobRecord(jobId);
    if (result && result.success) {
        if (typeof showToast === "function") {
            showToast("Job deleted successfully.", "success");
        }
        renderClientJobsTable();
        return;
    }

    if (typeof showToast === "function") {
        showToast(result?.error?.message || "Unable to delete this job.", "error");
    }
}

window.deleteClientJob = deleteClientJob;
/**
 * ADMIN DASHBOARD ENGINE
 */
function initAdminDashboard() {
    const isAdminDash = document.getElementById("adminDashboardRoot");
    if (!isAdminDash) return;

    if (typeof enforceRoleAccess === "function") {
        enforceRoleAccess("admin");
    }

    loadAdminRecords().then(records => {
        renderAdminStats(records);
        renderAdminUsersTable(records.users);
        renderAdminJobsTable(records.jobs, records.users);
        renderAdminProjectsTable(records.projects, records.users);
        renderAdminTransactions(records.transactions);
        renderAdminReports(records.jobs, records.projects);
    });
}

async function loadAdminRecords() {
    const records = {
        users: typeof getUsers === "function" ? getUsers() : [],
        jobs: typeof getStoredJobs === "function" ? getStoredJobs() : [],
        projects: typeof getStoredProjects === "function" ? getStoredProjects() : [],
        transactions: typeof getStoredTransactions === "function" ? getStoredTransactions() : []
    };

    await window.supabaseBootstrapPromise;
    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseClient) return records;

    const [usersResult, jobsResult, projectsResult, transactionsResult] = await Promise.all([
        window.supabaseClient.from("profiles").select("*"),
        window.supabaseClient.from("jobs").select("*"),
        window.supabaseClient.from("projects").select("*"),
        window.supabaseClient.from("transactions").select("*")
    ]);

    if (Array.isArray(usersResult.data)) records.users = usersResult.data;
    if (Array.isArray(jobsResult.data)) records.jobs = jobsResult.data.map(normalizeJobRecord);
    if (Array.isArray(projectsResult.data)) records.projects = projectsResult.data.map(normalizeProjectRecord);
    if (Array.isArray(transactionsResult.data)) records.transactions = transactionsResult.data.map(normalizeTransactionRecord);
    return records;
}

function formatAdminCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

function formatAdminDate(value) {
    const timestamp = Date.parse(value || "");
    return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(timestamp) : "—";
}

function renderAdminStats(records = {}) {
    const users = records.users || [];
    const jobs = records.jobs || [];
    const projects = records.projects || [];
    const transactions = records.transactions || [];
    const activeStatuses = new Set(["pending", "in_progress", "review", "active"]);
    const completedPayments = transactions.filter(transaction =>
        transaction.status === "completed" && ["payment", "escrow_release"].includes(transaction.type)
    );
    const platformFee = completedPayments.reduce((total, transaction) => total + Number(transaction.amount || 0) * 0.05, 0);

    const elemUsers = document.getElementById("adminStatTotalUsers");
    if (elemUsers) elemUsers.textContent = users.length;

    const elemJobs = document.getElementById("adminStatTotalJobs");
    if (elemJobs) elemJobs.textContent = jobs.length;

    const elemProjects = document.getElementById("adminStatProjects");
    if (elemProjects) elemProjects.textContent = projects.filter(project => activeStatuses.has(project.status)).length;

    const elemRevenue = document.getElementById("adminStatPlatformRevenue");
    if (elemRevenue) elemRevenue.textContent = formatAdminCurrency(platformFee);
}

function renderAdminUsersTable(users = (typeof getUsers === "function" ? getUsers() : [])) {
    const table = document.getElementById("adminUsersTable");
    if (!table) return;

    if (!users.length) {
        table.innerHTML = '<tr><td colspan="5">No registered accounts found.</td></tr>';
        return;
    }

    const sortedUsers = users.slice().sort((first, second) => Date.parse(second.created_at || second.createdAt || 0) - Date.parse(first.created_at || first.createdAt || 0));
    const dashboard = Boolean(document.getElementById("adminStatTotalUsers"));
    const displayedUsers = dashboard ? sortedUsers.slice(0, 6) : sortedUsers;
    table.innerHTML = displayedUsers.map(user => `
        <tr>
            <td><strong>${escapeDashboardText(user.name || `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim() || "User")}</strong></td>
            <td>${escapeDashboardText(user.email || "")}</td>
            <td><span class="status-indicator">${escapeDashboardText((user.role || "user").toUpperCase())}</span></td>
            <td><span class="badge badge-success">${escapeDashboardText(user.status ? user.status.toUpperCase() : "REGISTERED")}</span></td>
            <td>${formatAdminDate(user.created_at || user.createdAt)}</td>
        </tr>
    `).join("");
}

function renderAdminJobsTable(jobs = [], users = []) {
    const table = document.getElementById("adminJobsTable");
    if (!table) return;
    if (!jobs.length) {
        table.innerHTML = '<tr><td colspan="5">No job postings found.</td></tr>';
        return;
    }

    const usersById = new Map(users.map(user => [String(user.id), user]));
    table.innerHTML = jobs.map(job => {
        const client = usersById.get(String(job.clientId || job.client_id));
        const clientName = job.client?.name && job.client.name !== "Client"
            ? job.client.name
            : client?.name || [client?.first_name, client?.last_name].filter(Boolean).join(" ") || job.client_name || "Account unavailable";
        return `<tr><td><strong>${escapeDashboardText(job.title)}</strong></td><td>${escapeDashboardText(clientName)}</td><td>${escapeDashboardText(job.category)}</td><td>${formatAdminCurrency(job.budgetMin ?? job.budget_min)} – ${formatAdminCurrency(job.budgetMax ?? job.budget_max)}</td><td><span class="status-indicator">${escapeDashboardText(String(job.status || "open").replaceAll("_", " ").toUpperCase())}</span></td></tr>`;
    }).join("");
}

function renderAdminProjectsTable(projects = [], users = []) {
    const table = document.getElementById("adminProjectsTable");
    if (!table) return;
    if (!projects.length) {
        table.innerHTML = '<tr><td colspan="5">No contracts found.</td></tr>';
        return;
    }

    const usersById = new Map(users.map(user => [String(user.id), user]));
    const profileName = profile => profile?.name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Account unavailable";
    table.innerHTML = projects.map(project => {
        const client = usersById.get(String(project.clientId || project.client_id));
        const freelancer = usersById.get(String(project.freelancerId || project.freelancer_id));
        const clientName = project.clientName && project.clientName !== "Client" ? project.clientName : profileName(client);
        const freelancerName = project.freelancerName && project.freelancerName !== "Freelancer" ? project.freelancerName : profileName(freelancer);
        return `<tr><td><strong>${escapeDashboardText(project.jobTitle || project.title)}</strong></td><td>${escapeDashboardText(clientName)}</td><td>${escapeDashboardText(freelancerName)}</td><td>${formatAdminCurrency(project.amount)}</td><td><span class="status-indicator">${escapeDashboardText(String(project.status || "pending").replaceAll("_", " ").toUpperCase())}</span></td></tr>`;
    }).join("");
}

function renderAdminTransactions(transactions = []) {
    const completed = transactions.filter(transaction => transaction.status === "completed");
    const payments = completed.filter(transaction => ["payment", "escrow_release"].includes(transaction.type));
    const volume = payments.reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const fees = volume * 0.05;
    const withdrawals = completed.filter(transaction => transaction.type === "withdrawal")
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const volumeElement = document.getElementById("adminTransactionVolume");
    const feeElement = document.getElementById("adminTransactionFees");
    const withdrawalsElement = document.getElementById("adminTransactionWithdrawals");
    if (volumeElement) volumeElement.textContent = formatAdminCurrency(volume);
    if (feeElement) feeElement.textContent = formatAdminCurrency(fees);
    if (withdrawalsElement) withdrawalsElement.textContent = formatAdminCurrency(withdrawals);

    const table = document.getElementById("adminTransactionsTable");
    if (!table) return;
    if (!transactions.length) {
        table.innerHTML = '<tr><td colspan="6">No transactions found.</td></tr>';
        return;
    }
    table.innerHTML = transactions.slice().sort((first, second) => Date.parse(second.createdAt || 0) - Date.parse(first.createdAt || 0)).map(transaction => `
        <tr><td>${escapeDashboardText(transaction.id || "-")}</td><td><span class="status-indicator">${escapeDashboardText(String(transaction.type || "transaction").replaceAll("_", " ").toUpperCase())}</span></td><td>${escapeDashboardText(transaction.title || transaction.reference || transaction.type || "Transaction")}</td><td>${formatAdminCurrency(transaction.amount)}</td><td>${transaction.status === "completed" && ["payment", "escrow_release"].includes(transaction.type) ? formatAdminCurrency(Number(transaction.amount || 0) * 0.05) : formatAdminCurrency(0)}</td><td>${escapeDashboardText(String(transaction.status || "pending").toUpperCase())}</td></tr>
    `).join("");
}

function renderAdminReports(jobs = [], projects = []) {
    const categoryRoot = document.getElementById("adminReportCategories");
    const completionElement = document.getElementById("adminReportCompletionRate");
    const hiringElement = document.getElementById("adminReportAverageHireTime");
    if (categoryRoot) {
        const counts = jobs.reduce((result, job) => result.set(job.category || "Uncategorized", (result.get(job.category || "Uncategorized") || 0) + 1), new Map());
        const categories = [...counts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 5);
        categoryRoot.innerHTML = categories.length ? categories.map(([category, count]) => {
            const percentage = Math.round(count / jobs.length * 100);
            return `<div><div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:6px"><span style="font-weight:600">${escapeDashboardText(category)}</span><span style="font-weight:700">${percentage}%</span></div><div style="width:100%;height:8px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden"><div style="width:${percentage}%;height:100%;background:var(--primary);border-radius:4px"></div></div></div>`;
        }).join("") : "<p>No job category data available.</p>";
    }

    const completedProjects = projects.filter(project => project.status === "completed").length;
    if (completionElement) completionElement.textContent = projects.length ? `${(completedProjects / projects.length * 100).toFixed(1)}%` : "—";
    const jobDates = new Map(jobs.map(job => [String(job.id), Date.parse(job.created_at || job.postedTimestamp || "")]));
    const durations = projects.map(project => {
        const postedAt = jobDates.get(String(project.jobId || project.job_id));
        const startedAt = Date.parse(project.createdAt || project.created_at || "");
        return Number.isFinite(postedAt) && Number.isFinite(startedAt) && startedAt >= postedAt ? (startedAt - postedAt) / 86400000 : null;
    }).filter(duration => duration !== null);
    if (hiringElement) hiringElement.textContent = durations.length ? `${(durations.reduce((total, duration) => total + duration, 0) / durations.length).toFixed(1)} days` : "—";
}

// Window scope exports
window.initDashboardCore = initDashboardCore;
window.renderFreelancerStats = renderFreelancerStats;
window.renderClientStats = renderClientStats;
window.renderAdminStats = renderAdminStats;
window.renderAdminUsersTable = renderAdminUsersTable;
window.renderAdminJobsTable = renderAdminJobsTable;
window.renderAdminProjectsTable = renderAdminProjectsTable;
window.renderAdminTransactions = renderAdminTransactions;
window.renderAdminReports = renderAdminReports;
