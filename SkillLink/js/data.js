// This file manages data interactions with the Supabase cloud database.

const { createClient } = supabase;

// Initialize Supabase client
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch user data
async function fetchUserData(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);

    if (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
    return data;
}

// Function to store user data
async function storeUserData(user) {
    const { data, error } = await supabase
        .from('users')
        .insert([user]);

    if (error) {
        console.error('Error storing user data:', error);
        return null;
    }
    return data;
}

// Function to update user data
async function updateUserData(userId, updates) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating user data:', error);
        return null;
    }
    return data;
}

// Function to delete user data
async function deleteUserData(userId) {
    const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user data:', error);
        return null;
    }
    return data;
}