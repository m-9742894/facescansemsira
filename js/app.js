// Global variables
let modelsLoaded = false;
let currentUser = null;

// Load face-api models
async function loadFaceApiModels() {
    try {
        const modelPath = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/models/';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
            faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
        ]);
        
        modelsLoaded = true;
        console.log('Models loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading models:', error);
        return false;
    }
}

// Format date
function formatDate(date = new Date()) {
    return date.toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format time
function formatTime(date = new Date()) {
    return date.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Show notification
function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div>
            <strong>${type === 'success' ? 'Berjaya!' : 'Ralat!'}</strong>
            <p>${message}</p>
        </div>
        <button class="close-btn" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Toggle mobile menu
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Load models
    loadFaceApiModels();
    
    // Update dashboard stats if on index page
    if (document.getElementById('stats-container')) {
        updateDashboardStats();
    }
});

// Update dashboard stats
function updateDashboardStats() {
    const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    
    const today = new Date().toDateString();
    const todayAttendance = attendanceRecords.filter(r => r.date === today);
    
    document.getElementById('total-registered').textContent = registeredFaces.length;
    document.getElementById('total-present').textContent = todayAttendance.length;
    
    // Calculate average time
    if (todayAttendance.length > 0) {
        const times = todayAttendance.map(r => {
            const [hours, minutes] = r.time.split(':');
            return parseInt(hours) * 60 + parseInt(minutes);
        });
        const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        document.getElementById('avg-time').textContent = `${avgHours}:${avgMins.toString().padStart(2, '0')}`;
    }
    
    // Update recent attendance
    const recentList = document.getElementById('recent-attendance');
    if (recentList) {
        recentList.innerHTML = attendanceRecords.slice(-5).reverse().map(record => `
            <div class="recent-item">
                <i class="fas fa-user-circle"></i>
                <div class="recent-info">
                    <h4>${record.name}</h4>
                    <p>ID: ${record.id || '-'}</p>
                </div>
                <div class="recent-time">
                    <i class="far fa-clock"></i> ${record.time}
                </div>
            </div>
        `).join('');
    }
}
