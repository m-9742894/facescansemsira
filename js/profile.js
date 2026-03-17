// Profile page variables
let profileChart = null;

// Load profile on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadAttendanceChart();
    loadRecentActivity();
    loadDevices();
});

// Load user profile
function loadProfile() {
    const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
    
    if (registeredFaces.length > 0) {
        // For demo, use the first registered user
        const user = registeredFaces[0];
        
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-id').textContent = `ID: ${user.id}`;
        
        // Load settings
        document.getElementById('settings-email').value = user.email || '';
        document.getElementById('settings-phone').value = user.phone || '';
        
        // Calculate stats
        updateProfileStats(user.id);
    }
}

// Update profile stats
function updateProfileStats(userId) {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const userRecords = attendanceRecords.filter(r => r.id === userId);
    
    const totalAttendance = userRecords.length;
    
    // Calculate attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRecords = userRecords.filter(r => new Date(r.date) >= thirtyDaysAgo);
    const attendanceRate = Math.round((recentRecords.length / 30) * 100);
    
    // Calculate streak
    let streak = 0;
    const dates = [...new Set(userRecords.map(r => r.date))].sort();
    
    for (let i = dates.length - 1; i >= 0; i--) {
        const currentDate = new Date(dates[i]);
        const prevDate = i > 0 ? new Date(dates[i - 1]) : null;
        
        if (i === dates.length - 1) {
            streak = 1;
        } else if (prevDate) {
            const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
    }
    
    document.getElementById('total-attendance').textContent = totalAttendance;
    document.getElementById('attendance-rate').textContent = attendanceRate + '%';
    document.getElementById('streak-days').textContent = streak;
    document.getElementById('best-streak').textContent = streak + ' hari';
    
    // Monthly count
    const thisMonth = new Date().getMonth();
    const monthlyCount = userRecords.filter(r => new Date(r.date).getMonth() === thisMonth).length;
    document.getElementById('monthly-count').textContent = monthlyCount;
}

// Load attendance chart
function loadAttendanceChart() {
    const ctx = document.getElementById('attendance-chart')?.getContext('2d');
    if (!ctx) return;
    
    // Get last 7 days data
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('ms-MY', { weekday: 'short' }));
        
        const dateStr = date.toDateString();
        const count = filteredAttendanceByDate(dateStr);
        data.push(count);
    }
    
    if (profileChart) {
        profileChart.destroy();
    }
    
    profileChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kehadiran',
                data: data,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    stepSize: 1
                }
            }
        }
    });
}

// Filter attendance by date
function filteredAttendanceByDate(dateStr) {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    return attendanceRecords.filter(r => r.date === dateStr).length;
}

// Load recent activity
function loadRecentActivity() {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const recent = attendanceRecords.slice(-5).reverse();
    
    const timeline = document.getElementById('timeline');
    if (timeline) {
        timeline.innerHTML = recent.map(record => `
            <div class="timeline-item">
                <h4>${record.name}</h4>
                <p>ID: ${record.id}</p>
                <small>${record.date} • ${record.time}</small>
            </div>
        `).join('');
    }
    
    const profileRecent = document.getElementById('profile-recent');
    if (profileRecent) {
        profileRecent.innerHTML = recent.map(record => `
            <div class="recent-item">
                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                <div class="recent-info">
                    <h4>${record.name}</h4>
                    <p>${record.date}</p>
                </div>
                <div class="recent-time">
                    ${record.time}
                </div>
            </div>
        `).join('');
    }
}

// Load devices
function loadDevices() {
    const devices = [
        { name: 'Chrome on Windows', location: 'Kuala Lumpur', lastActive: 'Sekarang', current: true },
        { name: 'Safari on iPhone', location: 'Selangor', lastActive: '2 jam lepas', current: false }
    ];
    
    const devicesList = document.getElementById('devices-list');
    if (devicesList) {
        devicesList.innerHTML = devices.map(device => `
            <div class="recent-item">
                <i class="fas ${device.current ? 'fa-laptop' : 'fa-mobile-alt'}"></i>
                <div class="recent-info">
                    <h4>${device.name} ${device.current ? '(Peranti Semasa)' : ''}</h4>
                    <p>${device.location} • Aktif: ${device.lastActive}</p>
                </div>
            </div>
        `).join('');
    }
}

// Show profile tab
function showProfileTab(tabName) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
}

// Settings form submit
document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('Tetapan berjaya disimpan', 'success');
});

// Password form submit
document.getElementById('password-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('Kata laluan berjaya ditukar', 'success');
});

// Delete account
function deleteAccount() {
    if (confirm('Anda pasti mahu memadam akaun ini? Tindakan ini tidak boleh dibatalkan.')) {
        // Clear user data
        localStorage.removeItem('registeredFaces');
        localStorage.removeItem('attendanceRecords');
        
        showNotification('Akaun berjaya dipadam', 'success');
        
        // Redirect to home
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}
