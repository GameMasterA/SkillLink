/**
 * SkillLink — Central Auth & Role Router Engine (js/auth.js)
 * Manages user accounts, local session state, role-based sub-folder routing, and access protection.
 */

const STORAGE_USERS = "skillLinkUsers";
const STORAGE_CURRENT_USER = "skillLinkUser";
const LEGACY_DEMO_EMAILS = new Set([
    "admin@skilllink.com",
    "freelancer@skilllink.com",
    "client@skilllink.com"
]);

const DEFAULT_USERS = [];

function sanitizeLocalUsers(users) {
    return users
        .filter(user => user && !LEGACY_DEMO_EMAILS.has(String(user.email || "").toLowerCase()))
        .map(({ password, ...user }) => user);
}

function initUsers() {
    let stored = localStorage.getItem(STORAGE_USERS);
    if (!stored) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
        return;
    }

    try {
        const users = JSON.parse(stored);
        if (!Array.isArray(users)) {
            localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
            return;
        }

        const sanitizedUsers = sanitizeLocalUsers(users);
        if (JSON.stringify(sanitizedUsers) !== JSON.stringify(users)) {
            localStorage.setItem(STORAGE_USERS, JSON.stringify(sanitizedUsers));
        }
    } catch (error) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
    }
}

function getUsers() {
    initUsers();
    return sanitizeLocalUsers(JSON.parse(localStorage.getItem(STORAGE_USERS)) || []);
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(sanitizeLocalUsers(users)));
}

function getCurrentUser() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_CURRENT_USER) || "null");
    if (currentUser && (currentUser.password || LEGACY_DEMO_EMAILS.has(String(currentUser.email || "").toLowerCase()) || String(currentUser.id || "").startsWith("usr-"))) {
        localStorage.removeItem(STORAGE_CURRENT_USER);
        return null;
    }
    return currentUser;
}

function setCurrentUser(user) {
    const { password, ...safeUser } = user;
    localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(safeUser));
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
        handleAuthReturnFromEmail();
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

async function handleAuthReturnFromEmail() {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified") === "1";
    const notice = params.get("notice");

    if (verified) {
        try {
            await window.supabaseBootstrapPromise;
            await window.supabaseReady;
            await window.supabaseClient.auth.signOut();
        } catch (error) {
            console.warn("Unable to clear the confirmation callback session:", error);
        }

        localStorage.removeItem(STORAGE_CURRENT_USER);
        setAlert("loginAlert", "Email confirmed. Your account is ready. Please sign in.", false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (notice === "check-email") {
        setAlert("loginAlert", "Account created. Check your inbox and confirm your email, then sign in here.", false);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (notice === "profile-retry") {
        setAlert("loginAlert", "Your account was created and a confirmation email was sent. Confirm your email, then sign in to finish setting up your profile.", false);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (notice === "account-ready") {
        setAlert("loginAlert", "Account created. Please sign in.", false);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

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

    try {
        await window.supabaseBootstrapPromise;
        await window.supabaseReady;
    } catch (error) {
        setAlert("regAlert", "Cloud sign-up is temporarily unavailable. Please try again shortly.");
        return;
    }

    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseClient) {
        setAlert("regAlert", "Cloud sign-up is not configured. Please contact support.");
        return;
    }

    const role = document.getElementById("selectedRole")?.value || "freelancer";
    const firstName = document.getElementById("firstName")?.value.trim();
    const lastName = document.getElementById("lastName")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("regPassword")?.value;

    if (!firstName || !lastName || !email || !password) {
        setAlert("regAlert", "Please complete all required fields.");
        return;
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data: matchingProfiles, error: profileLookupError } = await window.supabaseClient
                .from("profiles")
                .select("id,email", { email });

            if (!profileLookupError && Array.isArray(matchingProfiles) && matchingProfiles.some(profile =>
                String(profile.email || "").trim().toLowerCase() === email
            )) {
                setAlert("regAlert", "An account with this email already exists. Please sign in or use a different email address.");
                return;
            }

            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role,
                        first_name: firstName,
                        last_name: lastName,
                        name: `${firstName} ${lastName}`
                    },
                    emailRedirectTo: `${window.location.origin}/login.html?verified=1`
                }
            });

            if (error) {
                const duplicateEmail = ["email_exists", "user_already_exists"].includes(error.code);
                setAlert("regAlert", duplicateEmail
                    ? "An account with this email already exists. Please sign in or use a different email address."
                    : (error.message || "Unable to create account right now."));
                return;
            }

            if (!data?.user) {
                setAlert("regAlert", "Supabase did not return a new account. Please try again.");
                return;
            }

            if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                setAlert("regAlert", "An account with this email already exists. Please sign in or use a different email address.");
                return;
            }

            const authUser = data?.user;
            const localUserMirror = {
                id: authUser?.id || `usr-${Date.now()}`,
                email,
                role,
                firstName,
                lastName,
                name: `${firstName} ${lastName}`,
                title: role === "freelancer" ? (document.getElementById("primarySkill")?.value || "Web Development") : "Client",
                primarySkill: role === "freelancer" ? (document.getElementById("primarySkill")?.value || "Web Development") : null,
                company: role === "client" ? (document.getElementById("companyName")?.value.trim() || "Independent Client") : null,
                startingPrice: role === "freelancer" ? 45000 : 0,
                availability: "Available Now",
                createdAt: new Date().toISOString()
            };

            const profilePayload = {
                id: localUserMirror.id,
                email,
                role,
                first_name: firstName,
                last_name: lastName,
                name: `${firstName} ${lastName}`,
                title: localUserMirror.title,
                primary_skill: localUserMirror.primarySkill,
                company: localUserMirror.company,
                starting_price: localUserMirror.startingPrice,
                completed_jobs: role === "freelancer" ? 0 : 0,
                jobs_posted: role === "client" ? 0 : 0,
                rating: 5.0,
                reviews_count: 0,
                availability: localUserMirror.availability,
                created_at: localUserMirror.createdAt
            };

            const { error: profileError } = await window.supabaseClient.from("profiles").insert([profilePayload]);
            if (profileError) {
                console.warn("[SkillLink] Profile creation will be retried after sign-in:", profileError);
            }

            if (!data.session) {
                window.location.assign(profileError ? "login.html?notice=profile-retry" : "login.html?notice=check-email");
                return;
            }

            await window.supabaseClient.auth.signOut();
            window.location.assign("login.html?notice=account-ready");
            return;
        } catch (err) {
            setAlert("regAlert", err.message || "Unable to create your account.");
            return;
        }
    }

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

    try {
        await window.supabaseBootstrapPromise;
        await window.supabaseReady;
    } catch (error) {
        setAlert("loginAlert", "Cloud sign-in is temporarily unavailable. Please try again shortly.");
        return;
    }

    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseClient) {
        setAlert("loginAlert", "Cloud sign-in is not configured. Please contact support.");
        return;
    }

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                const message = error.code === "email_not_confirmed"
                    ? "Please confirm your email address using the link we sent before signing in."
                    : (error.message || "Invalid email address or password.");
                setAlert("loginAlert", message);
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

            const allUsers = getUsers();
            const existingEntryIndex = allUsers.findIndex(u => String(u.email || '').toLowerCase() === String(email).toLowerCase());
            const localMirror = {
                ...profile,
                id: profile.id || data?.user?.id || `usr-${Date.now()}`,
                email,
                role: profile.role || fallbackRole,
                firstName: profile.first_name || data?.user?.user_metadata?.first_name || profile.name?.split(' ')[0] || 'User',
                lastName: profile.last_name || data?.user?.user_metadata?.last_name || '',
                name: profile.name || `${(data?.user?.user_metadata?.first_name || 'User')}`.trim() || 'User',
                title: profile.title || 'Freelancer',
                company: profile.company || null,
                startingPrice: Number(profile.starting_price || 0),
                availability: profile.availability || 'Available Now'
            };

            if (existingEntryIndex >= 0) {
                allUsers[existingEntryIndex] = { ...allUsers[existingEntryIndex], ...localMirror };
            } else {
                allUsers.push(localMirror);
            }
            saveUsers(allUsers);
            if (typeof syncFreelancersFromUsers === "function") {
                syncFreelancersFromUsers();
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