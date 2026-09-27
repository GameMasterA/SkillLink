# SkillLink Marketplace

## Overview
SkillLink is a marketplace platform designed to connect freelancers with clients. Users can create accounts as either freelancers or clients, allowing them to find projects or hire talent.

## Project Structure
The project is organized into the following directories and files:

```
SkillLink
├── css
│   ├── auth.css          # Styles for authentication pages
│   ├── responsive.css     # Responsive styles for various devices
│   └── style.css         # General application styles
├── js
│   ├── auth.js           # Authentication logic for user registration and login
│   ├── data.js           # Data management and interactions
│   ├── main.js           # Main JavaScript entry point
│   └── supabase-client.js # Client-side code for Supabase cloud database interactions
├── index.html            # Main landing page
├── login.html            # User login form
├── register.html         # User registration form
├── supabase
│   └── schema.sql        # Database schema for Supabase
└── README.md             # Project documentation
```

## Setup Instructions
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd SkillLink
   ```

2. **Install Dependencies**
   Ensure you have the necessary dependencies installed. If using npm, run:
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a Supabase account and project.
   - Update the `supabase-client.js` file with your Supabase URL and API key.

4. **Run the Application**
   Open `index.html` in your web browser to view the application.

## Features
- User registration and login for freelancers and clients.
- Role selection to tailor the user experience.
- Responsive design for accessibility on various devices.
- Integration with Supabase for cloud database functionality.

## Usage Guidelines
- Freelancers can showcase their skills and find projects.
- Clients can post job offers and hire verified freelancers.
- Ensure to follow best practices for security, especially regarding user data and authentication.

## Contribution
Feel free to contribute to the project by submitting issues or pull requests.