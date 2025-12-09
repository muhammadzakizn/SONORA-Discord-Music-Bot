// Admin Panel Script - Fixed Version

console.log('Admin panel script loading...');

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initialized');
    
    // Safe function to add class
    function safeAddClass(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    }
    
    // Load activity safely
    async function loadActivity() {
        console.log('Loading activity...');
        try {
            const response = await fetch('/api/admin/activity');
            if (response.ok) {
                const data = await response.json();
                console.log('Activity data:', data);
                // Update UI with activity data
            }
        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }
    
    // Initialize admin controls if available
    if (window.adminControls) {
        console.log('Admin controls available');
    }
    
    // Load initial data
    loadActivity();
});

console.log('Admin panel script loaded');
