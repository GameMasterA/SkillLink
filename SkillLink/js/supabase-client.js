const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://your-supabase-url.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'your-anon-key'; // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to sign up a new user
async function signUp(email, password) {
    const { user, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) {
        throw error;
    }
    return user;
}

// Function to sign in an existing user
async function signIn(email, password) {
    const { user, error } = await supabase.auth.signIn({
        email,
        password,
    });
    if (error) {
        throw error;
    }
    return user;
}

// Function to sign out the current user
async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw error;
    }
}

// Function to fetch user data
async function fetchUser() {
    const user = supabase.auth.user();
    return user;
}

// Export functions for use in other modules
export { signUp, signIn, signOut, fetchUser };