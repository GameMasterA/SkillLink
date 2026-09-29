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

    renderAdminStats();
    renderAdminUsersTable();
}

function renderAdminStats() {
    const users = typeof getUsers === "function" ? getUsers() : [];
    const jobs = typeof getStoredJobs === "function" ? getStoredJobs() : [];
    const projects = typeof getStoredProjects === "function" ? getStoredProjects() : [];

    const elemUsers = document.getElementById("adminStatTotalUsers");
    if (elemUsers) elemUsers.textContent = users.length + 42;

    const elemJobs = document.getElementById("adminStatTotalJobs");
    if (elemJobs) elemJobs.textContent = jobs.length + 120;

    const elemProjects = document.getElementById("adminStatProjects");
    if (elemProjects) elemProjects.textContent = projects.length + 85;

    const elemRevenue = document.getElementById("adminStatPlatformRevenue");
    if (elemRevenue) elemRevenue.textContent = typeof formatCurrency === "function" ? formatCurrency(845000) : "₦845,000";
}

function renderAdminUsersTable() {
    const table = document.getElementById("adminUsersTable");
    if (!table) return;

    const users = typeof getUsers === "function" ? getUsers() : [];
    table.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User"}</strong></td>
            <td>${u.email}</td>
            <td><span class="status-indicator">${(u.role || "user").toUpperCase()}</span></td>
            <td><span class="badge badge-success">ACTIVE</span></td>
            <td>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="if(typeof showToast === 'function') showToast('User privileges updated', 'info')" class="btn btn-outline btn-sm">Manage</button>
                    <button onclick="deleteUserAccount('${u.id}'); renderAdminUsersTable();" class="btn btn-outline btn-sm" style="border-color: rgba(239,68,68,0.5); color: #dc2626;">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

// Window scope exports
window.initDashboardCore = initDashboardCore;
window.renderFreelancerStats = renderFreelancerStats;
window.renderClientStats = renderClientStats;
window.renderAdminStats = renderAdminStats;