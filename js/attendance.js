// Attendance page variables
let attendanceVideo = document.getElementById('attendance-video');
let overlayCanvas = document.getElementById('overlay-canvas');
let ctx = overlayCanvas?.getContext('2d');
let attendanceStream = null;
let scanInterval = null;
let faceMatcher = null;

// Start attendance scanning
async function startAttendance() {
    if (!modelsLoaded) {
        showNotification('Model masih dimuatkan...', 'error');
        return;
    }
    
    try {
        attendanceStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        attendanceVideo.srcObject = attendanceStream;
        
        // Set canvas size
        attendanceVideo.onloadedmetadata = () => {
            overlayCanvas.width = attendanceVideo.videoWidth;
            overlayCanvas.height = attendanceVideo.videoHeight;
        };
        
        // Load registered faces
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        if (registeredFaces.length > 0) {
            const labeledDescriptors = registeredFaces.map(face => {
                return new faceapi.LabeledFaceDescriptors(
                    face.name,
                    [new Float32Array(face.descriptor)]
                );
            });
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        }
        
        // Start scanning
        scanInterval = setInterval(scanFaces, 1000);
        
        // Update UI
        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('stop-btn').style.display = 'inline-flex';
        document.getElementById('attendance-status-card').innerHTML = `
            <div class="status-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="status-message">
                <h3>Mengimbas...</h3>
                <p>Pastikan wajah dalam kotak</p>
            </div>
        `;
        
    } catch (error) {
        showNotification('Gagal mengakses kamera: ' + error.message, 'error');
    }
}

// Stop attendance scanning
function stopAttendance() {
    if (attendanceStream) {
        attendanceStream.getTracks().forEach(track => track.stop());
        attendanceStream = null;
    }
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Update UI
    document.getElementById('start-btn').style.display = 'inline-flex';
    document.getElementById('stop-btn').style.display = 'none';
    document.getElementById('attendance-status-card').innerHTML = `
        <div class="status-icon">
            <i class="fas fa-info-circle"></i>
        </div>
        <div class="status-message">
            <h3>Sedia untuk scan</h3>
            <p>Klik 'Mula Scan' untuk memulakan</p>
        </div>
    `;
}

// Scan for faces
async function scanFaces() {
    if (!attendanceVideo.srcObject || !faceMatcher) return;
    
    try {
        // Detect faces
        const detections = await faceapi.detectAllFaces(
            attendanceVideo,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();
        
        // Clear canvas
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (detections.length > 0) {
            // Draw detections
            faceapi.draw.drawDetections(overlayCanvas, detections);
            
            // Match faces
            detections.forEach(detection => {
                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                
                if (bestMatch.label !== 'unknown') {
                    markAttendance(bestMatch.label, detection);
                }
            });
        }
    } catch (error) {
        console.error('Error scanning faces:', error);
    }
}

// Mark attendance
function markAttendance(name, detection) {
    const today = new Date().toDateString();
    const now = new Date();
    
    // Get registered user data
    const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
    const user = registeredFaces.find(f => f.name === name);
    
    // Get attendance records
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    
    // Check if already marked today
    const existing = attendanceRecords.find(record => 
        record.name === name && record.date === today
    );
    
    if (!existing) {
        const record = {
            id: user?.id || '-',
            name: name,
            date: today,
            time: formatTime(now),
            timestamp: now.getTime(),
            confidence: detection?.confidence || 1
        };
        
        attendanceRecords.push(record);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        // Show success notification
        showNotification(`${name} - Hadir direkodkan`, 'success');
        
        // Update attendance grid
        updateAttendanceGrid();
        
        // Show detailed notification
        const notification = document.getElementById('success-notification');
        document.getElementById('notification-detail').textContent = 
            `${name} pada ${record.time}`;
        notification.style.display = 'flex';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Update attendance grid
function updateAttendanceGrid() {
    const today = new Date().toDateString();
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    
    const grid = document.getElementById('attendance-grid');
    const count = document.getElementById('today-count');
    
    count.textContent = `${todayRecords.length} orang`;
    
    grid.innerHTML = todayRecords.map(record => `
        <div class="attendance-card">
            <i class="fas fa-check-circle"></i>
            <h4>${record.name}</h4>
            <p>ID: ${record.id}</p>
            <div class="time">
                <i class="far fa-clock"></i> ${record.time}
            </div>
        </div>
    `).join('');
}

// Toggle fullscreen
function toggleFullscreen() {
    const container = document.querySelector('.camera-wrapper');
    
    if (!document.fullscreenElement) {
        container.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Hide notification
function hideNotification() {
    document.getElementById('success-notification').style.display = 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAttendanceGrid();
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (attendanceStream) {
        attendanceStream.getTracks().forEach(track => track.stop());
    }
    if (scanInterval) {
        clearInterval(scanInterval);
    }
});
