// This file handles authentication logic, including user registration and login processes.

const { createClient } = supabase;

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('selectedRole').value;
    let additionalField;

    if (role === 'freelancer') {
        additionalField = document.getElementById('primarySkill').value;
    } else {
        additionalField = document.getElementById('companyName').value;
    }

    const { user, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        document.getElementById('regAlert').innerText = error.message;
        document.getElementById('regAlert').style.display = 'block';
    } else {
        await supabase
            .from('users')
            .insert([
                { 
                    id: user.id, 
                    first_name: firstName, 
                    last_name: lastName, 
                    role: role, 
                    additional_field: additionalField 
                }
            ]);
        window.location.href = 'index.html'; // Redirect to the main page after successful registration
    }
});

async function loginUser(email, password) {
    const { user, error } = await supabase.auth.signIn({
        email,
        password,
    });

    if (error) {
        console.error('Login error:', error.message);
    } else {
        window.location.href = 'index.html'; // Redirect to the main page after successful login
    }
}