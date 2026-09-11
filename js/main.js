/**
 * SkillLink — Core UI Orchestration Engine (js/main.js)
 * Manages layout effects, toast system, dynamic navbar, modal controllers, and smooth scroll behaviors.
 */

document.addEventListener("DOMContentLoaded", () => {
    initAppCore();
});

/**
 * Main Application Bootstrapper
 */
function initAppCore() {
    renderAuthNavbar();
    initMobileNavigation();
    initNavbarScrollEffect();
    initGlobalModalSystem();
    initGlobalDropdowns();
    initSmoothScrolling();
    initActiveNavLinks();
    initHeroButtons();
    initFooterYear();
}

/**
 * Apple-Inspired Liquid Glass Toast Notification System (Pure SVG Icons)
 */
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = `
        <svg class="svg-icon" viewBox="0 0 24 24" style="color:var(--primary);">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    `;

    if (type === 'success') {
        iconSvg = `
            <svg class="svg-icon" viewBox="0 0 24 24" style="color:var(--accent-emerald);">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
    } else if (type === 'error') {
        iconSvg = `
            <svg class="svg-icon" viewBox="0 0 24 24" style="color:var(--accent-rose);">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    } else if (type === 'warning') {
        iconSvg = `
            <svg class="svg-icon" viewBox="0 0 24 24" style="color:#d97706;">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `;
    }

    toast.innerHTML = `
        <span style="display:flex; align-items:center;">${iconSvg}</span>
        <span style="flex: 1; font-size: 0.9rem;">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close Notification">
            <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Dynamic Navbar Auth Badge vs Login Buttons Sync
 */
function renderAuthNavbar() {
    const navRight = document.getElementById("navAuthActions") || document.querySelector(".nav-actions");
    if (!navRight) return;

    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    const authButtons = navRight.querySelector("#authButtons") || navRight.querySelector(".auth-btn-group");
    let userMenu = navRight.querySelector("#userMenuNav");

    if (currentUser) {
        if (authButtons) authButtons.style.display = "none";
        
        let dashPath = "freelancer/dashboard.html";
        if (currentUser.role === "client") dashPath = "client/dashboard.html";
        if (currentUser.role === "admin") dashPath = "admin/dashboard.html";

        const isInSubfolder = window.location.pathname.includes('/client/') || 
                              window.location.pathname.includes('/freelancer/') || 
                              window.location.pathname.includes('/admin/');
        if (isInSubfolder) {
            dashPath = dashPath.split('/')[1];
        }

        if (!userMenu) {
            userMenu = document.createElement("div");
            userMenu.id = "userMenuNav";
            userMenu.className = "user-nav-badge";
            userMenu.style.display = "flex";
            userMenu.style.gap = "10px";
            userMenu.style.alignItems = "center";
            userMenu.innerHTML = `
                <a href="${dashPath}" class="btn btn-primary btn-sm">
                    Dashboard (${currentUser.firstName || currentUser.name.split(' ')[0]})
                </a>
                <button onclick="handleLogout()" class="btn btn-outline btn-sm">
                    Sign Out
                </button>
            `;
            navRight.appendChild(userMenu);
        } else {
            userMenu.style.display = "flex";
        }
    } else {
        if (userMenu) userMenu.style.display = "none";
        if (authButtons) authButtons.style.display = "flex";
    }
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNavigation() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const navLinks = document.querySelector(".nav-links") || document.getElementById("navLinks");

    if (!mobileMenuBtn || !navLinks) return;

    mobileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        mobileMenuBtn.classList.toggle("active");
        navLinks.classList.toggle("active");
        document.body.classList.toggle("no-scroll");
    });

    document.addEventListener("click", (e) => {
        if (navLinks.classList.contains("active") && !navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenuBtn.classList.remove("active");
            navLinks.classList.remove("active");
            document.body.classList.remove("no-scroll");
        }
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileMenuBtn.classList.remove("active");
            navLinks.classList.remove("active");
            document.body.classList.remove("no-scroll");
        });
    });
}

/**
 * Liquid Glass Header Scroll Effect
 */
function initNavbarScrollEffect() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const handleScroll = () => {
        if (window.scrollY > 20) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
}

/**
 * Universal Modal Management
 */
function initGlobalModalSystem() {
    const modals = document.querySelectorAll(".modal");

    modals.forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal || e.target.closest(".modal-close")) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const activeModal = document.querySelector(".modal.active");
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("active");
    document.body.classList.add("no-scroll");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("active");
    
    if (!document.querySelector(".modal.active")) {
        document.body.classList.remove("no-scroll");
    }
}

/**
 * Custom Dropdown Interface Controller
 */
function initGlobalDropdowns() {
    const dropdownTriggers = document.querySelectorAll(".dropdown-trigger");

    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const parent = trigger.closest(".dropdown");
            if (!parent) return;

            document.querySelectorAll(".dropdown.open").forEach(d => {
                if (d !== parent) d.classList.remove("open");
            });

            parent.classList.toggle("open");
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".dropdown.open").forEach(d => d.classList.remove("open"));
    });
}

/**
 * Smooth Scroll for In-Page Anchor Links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
}

/**
 * Highlight Active Nav Link
 */
function initActiveNavLinks() {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".nav-links a, .sidebar-link");

    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (!href) return;

        const linkPath = href.split("/").pop();
        if (linkPath === currentPath) {
            link.classList.add("active");
        }
    });
}

function initHeroButtons() {
    const hireBtn = document.getElementById("hireBtn");
    const workBtn = document.getElementById("workBtn");

    if (hireBtn) {
        hireBtn.addEventListener("click", () => handleDirectRoleSelection("client"));
    }

    if (workBtn) {
        workBtn.addEventListener("click", () => handleDirectRoleSelection("freelancer"));
    }
}

function handleDirectRoleSelection(role) {
    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    if (currentUser) {
        if (currentUser.role === "client") {
            window.location.href = "client/dashboard.html";
        } else if (currentUser.role === "freelancer") {
            window.location.href = "freelancer/dashboard.html";
        } else {
            window.location.href = "index.html";
        }
    } else {
        window.location.href = `register.html?role=${role}`;
    }
}

function initFooterYear() {
    const yearSpan = document.getElementById("currentYear");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function formatCurrency(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG');
}

// Global scope exports
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.debounce = debounce;
window.formatCurrency = formatCurrency;
window.renderAuthNavbar = renderAuthNavbar;