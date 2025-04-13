// Global state
let isAdmin = false;

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const closeButton = document.querySelector('.close-button');

    // Check authentication status
    checkAuthStatus();

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (response.ok && data.success) {
                isAdmin = data.isAdmin;
                loginModal.classList.remove('show');
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                loginForm.reset();
                location.reload(); // Refresh to update UI
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    });

    // Handle login button click
    loginButton.addEventListener('click', function() {
        loginModal.classList.add('show');
    });

    // Handle close button click
    closeButton.addEventListener('click', function() {
        loginModal.classList.remove('show');
        loginForm.reset();
    });

    // Close modal when clicking outside
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            loginModal.classList.remove('show');
            loginForm.reset();
        }
    });

    // Handle logout button click
    logoutButton.addEventListener('click', async function() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            location.reload(); // Refresh to update UI
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        }
    });
});

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.isLoggedIn && data.isAdmin) {
            isAdmin = true;
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('logout-button').style.display = 'block';
        } else {
            isAdmin = false;
            document.getElementById('login-button').style.display = 'block';
            document.getElementById('logout-button').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}
