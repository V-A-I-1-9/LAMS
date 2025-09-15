document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Helper function for non-blocking notifications
    function showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Main login function
    async function handleLogin() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            return showNotification('Please enter both username and password.', 'error');
        }

        // Give visual feedback
        loginBtn.textContent = 'Verifying...';
        loginBtn.disabled = true;

        const result = await window.api.login(username, password);

        if (result.success) {
            loginBtn.textContent = 'Success!';
            // Navigate to the main dashboard
            window.api.navigate('dashboard.html');
        } else {
            showNotification(`Login Failed: ${result.message}`, 'error');
            // Reset button
            loginBtn.textContent = 'Login';
            loginBtn.disabled = false;
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    
    // Allow login by pressing Enter key in the password field
    passwordInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
});