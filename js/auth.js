/**
 * SkillLink — Central Auth & Role Router Engine (js/auth.js)
 * Manages user accounts, local session state, role-based sub-folder routing, and access protection.
 */

const STORAGE_USERS = "skillLinkUsers";
const STORAGE_CURRENT_USER = "skillLinkUser";

const DEFAULT_USERS = [
    {
        id: "usr-demo-adm",
        role: "admin",
        firstName: "System",
        lastName: "Admin",
        name: "System Admin",
        email: "admin@skilllink.com",
        password: "admin123",
        createdAt: "2026-01-01T00:00:00.000Z"
    },
    {
        id: "usr-demo-fl",
        role: "freelancer",
        firstName: "John",
        lastName: "Doe",
        name: "John Doe",
        email: "freelancer@skilllink.com",
        password: "password123",
        skill: "Frontend Developer",
        bio: "Full-stack web developer specializing in clean vanilla JS, modern HTML5/CSS3, and sky-blue glassmorphism UI design.",
        title: "Frontend Developer & UI Specialist",
        startingPrice: 50000,
        completedJobs: 28,
        rating: 4.9,
        createdAt: "2026-01-15T08:00:00.000Z"
    },
    {
        id: "usr-demo-cl",
        role: "client",
        firstName: "Sarah",
        lastName: "Miller",
        name: "Sarah Miller",
        email: "client@skilllink.com",
        password: "password123",
        company: "Apex Tech Ventures",
        bio: "Tech entrepreneur hiring top-tier remote talent for web, mobile, and brand design projects.",
        jobsPosted: 12,
        rating: 4.9,
        createdAt: "2026-01-10T10:30:00.000Z"
    }
];

function initUsers() {
    let stored = localStorage.getItem(STORAGE_USERS);
    if (!stored) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
    } else {
        // Ensure admin always exists in storage even if storage was initialized before
        let users = JSON.parse(stored);
        if (!users.some(u => u.email === "admin@skilllink.com")) {
            users.push(DEFAULT_USERS[0]);
            localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
        }
    }
}

function getUsers() {
    initUsers();
    return JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_CURRENT_USER));
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
}

function updateUserProfile(updatedData) {
    let currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    currentUser = { ...currentUser, ...updatedData };
    setCurrentUser(currentUser);

    let users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...updatedData };
        saveUsers(users);
    }
    return currentUser;
}

async function syncUserProfileToSupabase(profileData) {
    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseClient) {
        return { success: true, error: null };
    }

    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        return { success: true, error: null };
    }

    const payload = {
        email: profileData.email || currentUser.email,
        role: profileData.role || currentUser.role,
        first_name: profileData.firstName || profileData.first_name || currentUser.firstName || currentUser.first_name || "",
        last_name: profileData.lastName || profileData.last_name || currentUser.lastName || currentUser.last_name || "",
        name: profileData.name || `${(profileData.firstName || currentUser.firstName || "").trim()} ${(profileData.lastName || currentUser.lastName || "").trim()}`.trim() || currentUser.name || "User",
        title: profileData.title || currentUser.title || currentUser.skill || "",
        bio: profileData.bio || currentUser.bio || "",
        company: profileData.company || currentUser.company || null,
        skills: Array.isArray(profileData.skills) ? profileData.skills : (Array.isArray(currentUser.skills) ? currentUser.skills : []),
        primary_skill: profileData.primarySkill || profileData.skill || currentUser.primarySkill || currentUser.skill || null,
        starting_price: Number(profileData.startingPrice ?? currentUser.startingPrice ?? 0),
        availability: profileData.availability || currentUser.availability || "Available Now"
    };

    try {
        const { error } = await window.supabaseClient.from("profiles").update(payload, { id: currentUser.id });
        return { success: !error, error };
    } catch (error) {
        return { success: false, error };
    }
}

function deleteUserAccount(userId) {
    if (!userId) return false;

    const users = getUsers().filter(u => String(u.id) !== String(userId));
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && String(currentUser.id) === String(userId)) {
        localStorage.removeItem(STORAGE_CURRENT_USER);
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabaseClient) {
        window.supabaseClient.from("profiles").delete({ id: userId }).catch(() => {});
    }

    return true;
}

function clearAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = "";
        el.className = "form-alert";
        el.style.display = "none";
    }
}

function setAlert(elementId, message, isError = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = `form-alert ${isError ? 'error' : 'success'}`;
        el.style.display = "block";
        el.style.color = isError ? "#f43f5e" : "#10b981";
    }
}

function redirectBasedOnRole(role) {
    const isInSubfolder = window.location.pathname.includes('/client/') || 
                          window.location.pathname.includes('/freelancer/') || 
                          window.location.pathname.includes('/admin/');

    const prefix = isInSubfolder ? '../' : '';

    if (role === 'client') {
        window.location.href = prefix + 'client/dashboard.html';
    } else if (role === 'freelancer') {
        window.location.href = prefix + 'freelancer/dashboard.html';
    } else if (role === 'admin') {
        window.location.href = prefix + 'admin/dashboard.html';
    } else {
        window.location.href = prefix + 'index.html';
    }
}

function enforceRoleAccess(allowedRole) {
    const currentUser = getCurrentUser();
    const isInSubfolder = window.location.pathname.includes('/client/') || 
                          window.location.pathname.includes('/freelancer/') || 
                          window.location.pathname.includes('/admin/');
    const prefix = isInSubfolder ? '../' : '';

    if (!currentUser) {
        window.location.href = prefix + 'login.html';
        return;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
        redirectBasedOnRole(currentUser.role);
    }
}

function selectRole(role) {
    const roleSelectionStep = document.getElementById("roleSelectionStep");
    const registrationFormStep = document.getElementById("registrationFormStep");
    const selectedRoleInput = document.getElementById("selectedRole");

    const formTitle = document.getElementById("formTitle");
    const formSubtitle = document.getElementById("formSubtitle");
    const freelancerFields = document.getElementById("freelancerFields");
    const clientFields = document.getElementById("clientFields");
    const primarySkill = document.getElementById("primarySkill");

    if (selectedRoleInput) selectedRoleInput.value = role;

    if (role === "freelancer") {
        if (formTitle) formTitle.textContent = "Join as a Freelancer";
        if (formSubtitle) formSubtitle.textContent = "Build your profile and discover remote work opportunities.";
        if (freelancerFields) freelancerFields.classList.remove("hidden");
        if (clientFields) clientFields.classList.add("hidden");
        if (primarySkill) primarySkill.setAttribute("required", "required");
    } else if (role === "client") {
        if (formTitle) formTitle.textContent = "Join as a Client";
        if (formSubtitle) formSubtitle.textContent = "Post projects and hire top freelance talent.";
        if (clientFields) clientFields.classList.remove("hidden");
        if (freelancerFields) freelancerFields.classList.add("hidden");
        if (primarySkill) primarySkill.removeAttribute("required");
    }

    if (roleSelectionStep) {
        roleSelectionStep.classList.add("hidden");
        roleSelectionStep.style.display = "none";
    }

    if (registrationFormStep) {
        registrationFormStep.classList.remove("hidden");
        registrationFormStep.style.display = "block";
    }
}

function goBackToRoles() {
    const roleSelectionStep = document.getElementById("roleSelectionStep");
    const registrationFormStep = document.getElementById("registrationFormStep");

    if (registrationFormStep) {
        registrationFormStep.classList.add("hidden");
        registrationFormStep.style.display = "none";
    }

    if (roleSelectionStep) {
        roleSelectionStep.classList.remove("hidden");
        roleSelectionStep.style.display = "block";
    }

    clearAlert("regAlert");
}

document.addEventListener("DOMContentLoaded", () => {
    initUsers();

    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get("role");

    if (roleParam === "client" || roleParam === "freelancer") {
        selectRole(roleParam);
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegisterSubmit);
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    const profileForm = document.getElementById("profileEditForm");
    if (profileForm) {
        profileForm.addEventListener("submit", handleProfileSaveSubmit);
        hydrateProfileForm();
    }

    const clientSettingsForm = document.getElementById("clientSettingsForm");
    if (clientSettingsForm) {
        clientSettingsForm.addEventListener("submit", handleClientSettingsSubmit);
        hydrateClientSettingsForm();
    }

    const freelancerSettingsForm = document.getElementById("freelancerSettingsForm");
    if (freelancerSettingsForm) {
        freelancerSettingsForm.addEventListener("submit", handleFreelancerSettingsSubmit);
        hydrateFreelancerSettingsForm();
    }
});

function hydrateProfileForm() {
    const user = getCurrentUser();
    if (!user) return;

    const titleField = document.getElementById("profTitle");
    if (titleField) titleField.value = user.title || user.skill || "";

    const bioField = document.getElementById("profBio");
    if (bioField) bioField.value = user.bio || "";

    const rateField = document.getElementById("profRate");
    if (rateField) rateField.value = user.startingPrice || user.starting_price || 0;

    const availabilityField = document.getElementById("profAvailability");
    if (availabilityField) availabilityField.value = user.availability || "Available Now";

    const skillsField = document.getElementById("profSkills");
    if (skillsField) skillsField.value = Array.isArray(user.skills) ? user.skills.join(", ") : (user.skill ? user.skill : "");
}

function hydrateClientSettingsForm() {
    const user = getCurrentUser();
    if (!user) return;

    const companyField = document.getElementById("clientCompanyName");
    if (companyField) companyField.value = user.company || "";
}

function hydrateFreelancerSettingsForm() {
    const user = getCurrentUser();
    if (!user) return;

    const emailField = document.getElementById("freelancerEmail");
    if (emailField) emailField.value = user.email || "";
}

async function handleProfileSaveSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const updatedUser = {
        ...user,
        title: document.getElementById("profTitle")?.value.trim() || user.title || user.skill || "",
        bio: document.getElementById("profBio")?.value.trim() || user.bio || "",
        availability: document.getElementById("profAvailability")?.value || user.availability || "Available Now",
        startingPrice: Number(document.getElementById("profRate")?.value || user.startingPrice || user.starting_price || 0),
        skills: document.getElementById("profSkills")?.value ? document.getElementById("profSkills").value.split(",").map(item => item.trim()).filter(Boolean) : (Array.isArray(user.skills) ? user.skills : [])
    };

    updateUserProfile(updatedUser);
    const syncResult = await syncUserProfileToSupabase(updatedUser);

    if (typeof showToast === "function") {
        showToast(syncResult.success ? "Profile updated successfully." : "Saved locally; cloud sync failed.", syncResult.success ? "success" : "info");
    }
}

async function handleClientSettingsSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const updatedUser = {
        ...user,
        company: document.getElementById("clientCompanyName")?.value.trim() || user.company || ""
    };

    updateUserProfile(updatedUser);
    const syncResult = await syncUserProfileToSupabase(updatedUser);

    if (typeof showToast === "function") {
        showToast(syncResult.success ? "Company settings updated successfully." : "Saved locally; cloud sync failed.", syncResult.success ? "success" : "info");
    }
}

async function handleFreelancerSettingsSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const updatedUser = {
        ...user,
        email: document.getElementById("freelancerEmail")?.value.trim().toLowerCase() || user.email,
        availability: document.getElementById("freelancerAvailability")?.value || user.availability || "Available Now"
    };

    updateUserProfile(updatedUser);
    const syncResult = await syncUserProfileToSupabase(updatedUser);

    if (typeof showToast === "function") {
        showToast(syncResult.success ? "Preferences saved successfully." : "Saved locally; cloud sync failed.", syncResult.success ? "success" : "info");
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAlert("regAlert");

    const role = document.getElementById("selectedRole")?.value || "freelancer";
    const firstName = document.getElementById("firstName")?.value.trim();
    const lastName = document.getElementById("lastName")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("regPassword")?.value;

    if (!firstName || !lastName || !email || !password) {
        setAlert("regAlert", "Please complete all required fields.");
        return;
    }

    const users = getUsers();
    if (users.some(u => u.email === email)) {
        setAlert("regAlert", "An account with this email address already exists.");
        return;
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role,
                        first_name: firstName,
                        last_name: lastName,
                        name: `${firstName} ${lastName}`
                    }
                }
            });

            if (error) {
                setAlert("regAlert", error.message || "Unable to create account right now.");
                return;
            }

            const profilePayload = {
                id: data?.user?.id || `usr-${Date.now()}`,
                email,
                role,
                first_name: firstName,
                last_name: lastName,
                name: `${firstName} ${lastName}`,
                title: role === "freelancer" ? (document.getElementById("primarySkill")?.value || "Web Development") : "Client",
                primary_skill: role === "freelancer" ? (document.getElementById("primarySkill")?.value || "Web Development") : null,
                company: role === "client" ? (document.getElementById("companyName")?.value.trim() || "Independent Client") : null,
                starting_price: role === "freelancer" ? 45000 : 0,
                completed_jobs: role === "freelancer" ? 0 : 0,
                jobs_posted: role === "client" ? 0 : 0,
                rating: 5.0,
                reviews_count: 0,
                availability: "Available Now",
                created_at: new Date().toISOString()
            };

            const { error: profileError } = await window.supabaseClient.from("profiles").insert([profilePayload]);
            if (profileError) {
                setAlert("regAlert", "Account created, but profile sync failed. Please sign in and complete your profile.");
                return;
            }

            setCurrentUser(profilePayload);
            setAlert("regAlert", "Account created successfully! Redirecting to your dashboard...", false);

            setTimeout(() => {
                redirectBasedOnRole(role);
            }, 600);
            return;
        } catch (err) {
            setAlert("regAlert", err.message || "Unable to create your account.");
            return;
        }
    }

    const newUser = {
        id: "usr-" + Date.now(),
        role: role,
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        password: password,
        loggedIn: true,
        isNewAccount: true,
        createdAt: new Date().toISOString()
    };

    if (role === "freelancer") {
        newUser.skill = document.getElementById("primarySkill")?.value || "Web Development";
        newUser.title = newUser.skill;
        newUser.startingPrice = 45000;
        newUser.rating = 5.0;
        newUser.completedJobs = 0;
        newUser.totalEarnings = 0;
        newUser.activeProjects = 0;
        newUser.submittedProposals = 0;
    } else {
        newUser.company = document.getElementById("companyName")?.value.trim() || "Independent Client";
        newUser.jobsPosted = 0;
        newUser.openJobs = 0;
        newUser.activeProjects = 0;
        newUser.proposalsReceived = 0;
        newUser.rating = 5.0;
    }

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    setAlert("regAlert", "Account created successfully! Redirecting to your dashboard...", false);

    setTimeout(() => {
        redirectBasedOnRole(newUser.role);
    }, 600);
}

async function createMissingProfileForAuthUser(userEmail, userId, fallbackRole = "freelancer") {
    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseClient) {
        return null;
    }

    try {
        const profileResult = await window.supabaseClient.from("profiles").select("*");
        const rows = Array.isArray(profileResult.data) ? profileResult.data : [];
        const existingProfile = rows.find(profile => String(profile.email || "").toLowerCase() === String(userEmail || "").toLowerCase());

        if (existingProfile) {
            return existingProfile;
        }

        const generatedProfile = {
            id: userId || `usr-${Date.now()}`,
            email: userEmail,
            role: fallbackRole,
            first_name: (userEmail || "User").split("@")[0].split(".")[0] || "User",
            last_name: "",
            name: (userEmail || "User").split("@")[0] || "User",
            title: fallbackRole === "client" ? "Client" : "Freelancer",
            bio: "",
            company: fallbackRole === "client" ? "Independent Client" : null,
            skills: [],
            primary_skill: fallbackRole === "client" ? null : "Web Development",
            starting_price: fallbackRole === "client" ? 0 : 45000,
            availability: "Available Now",
            created_at: new Date().toISOString()
        };

        const { error } = await window.supabaseClient.from("profiles").insert([generatedProfile]);
        if (error) {
            return generatedProfile;
        }

        return generatedProfile;
    } catch (error) {
        return null;
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    clearAlert("loginAlert");

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                setAlert("loginAlert", error.message || "Invalid email address or password.");
                return;
            }

            const fallbackRole = (data?.user?.user_metadata?.role || "freelancer");
            let profile = null;

            const profileResult = await window.supabaseClient.from("profiles").select("*");
            const rows = Array.isArray(profileResult.data) ? profileResult.data : [];
            const matchedProfile = rows.find(item => String(item.email || "").toLowerCase() === email);

            if (matchedProfile) {
                profile = matchedProfile;
            } else {
                profile = await createMissingProfileForAuthUser(email, data?.user?.id || `usr-${Date.now()}`, fallbackRole);
            }

            if (!profile) {
                profile = {
                    id: data?.user?.id || `usr-${Date.now()}`,
                    email,
                    role: fallbackRole,
                    name: data?.user?.email?.split("@")[0] || "User"
                };
            }

            setCurrentUser(profile);
            setAlert("loginAlert", "Authenticated! Redirecting to dashboard...", false);

            setTimeout(() => {
                redirectBasedOnRole(profile.role || fallbackRole || "freelancer");
            }, 600);
            return;
        } catch (err) {
            setAlert("loginAlert", err.message || "Login failed.");
            return;
        }
    }

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        setAlert("loginAlert", "Invalid email address or password.");
        return;
    }

    user.loggedIn = true;
    setCurrentUser(user);
    setAlert("loginAlert", "Authenticated! Redirecting to dashboard...", false);

    setTimeout(() => {
        redirectBasedOnRole(user.role);
    }, 600);
}

async function handleLogout() {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabaseClient && window.supabaseClient.auth) {
        await window.supabaseClient.auth.signOut();
    }
    localStorage.removeItem(STORAGE_CURRENT_USER);
    const isInSubfolder = window.location.pathname.includes('/client/') || 
                          window.location.pathname.includes('/freelancer/') || 
                          window.location.pathname.includes('/admin/');
    window.location.href = (isInSubfolder ? '../' : '') + 'login.html';
}

// Global scope exports
window.selectRole = selectRole;
window.goBackToRoles = goBackToRoles;
window.redirectBasedOnRole = redirectBasedOnRole;
window.enforceRoleAccess = enforceRoleAccess;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.updateUserProfile = updateUserProfile;
window.getUsers = getUsers;