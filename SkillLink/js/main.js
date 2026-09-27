// main.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initializeApp();
});

function initializeApp() {
    // Set up event listeners and any necessary initializations
    setupEventListeners();
}

function setupEventListeners() {
    // Example: Add event listeners for buttons or forms
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
}

function handleRegistration(event) {
    event.preventDefault();
    // Logic to handle user registration
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const selectedRole = document.getElementById('selectedRole').value;

    // Call the function to register the user with Supabase
    registerUser(firstName, lastName, email, password, selectedRole);
}

function registerUser(firstName, lastName, email, password, role) {
    // Use the Supabase client to register the user
    const { createClient } = supabaseClient; // Assuming supabaseClient is defined in supabase-client.js
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    supabase.auth.signUp({
        email: email,
        password: password,
    }).then(({ user, error }) => {
        if (error) {
            displayError(error.message);
        } else {
            // Additional logic to handle user role and store user data
            storeUserData(user.id, firstName, lastName, role);
        }
    });
}

function storeUserData(userId, firstName, lastName, role) {
    // Logic to store user data in the Supabase database
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    supabase.from('users').insert([
        { id: userId, first_name: firstName, last_name: lastName, role: role }
    ]).then(({ data, error }) => {
        if (error) {
            displayError(error.message);
        } else {
            // Redirect or show success message
            redirectToDashboard();
        }
    });
}

function displayError(message) {
    const alertBox = document.getElementById('regAlert');
    alertBox.innerText = message;
    alertBox.style.display = 'block';
}

function redirectToDashboard() {
    // Logic to redirect the user to their dashboard or home page
    window.location.href = 'index.html';
}