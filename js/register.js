// Register page specific variables
let registerVideo = document.getElementById('register-video');
let registerCanvas = document.getElementById('register-canvas');
let registerCtx = registerCanvas?.getContext('2d');
let currentStream = null;
let capturedImage = null;

// Navigation functions
function nextStep(step) {
    // Update steps
    document.querySelectorAll('.step').forEach((el, index) => {
        if (index + 1 < step) {
            el.classList.add('active');
        } else if (index + 1 === step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Show step content
    document.querySelectorAll('.step-content').forEach((el, index) => {
        if (index + 1 === step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Handle step 2
    if (step === 2) {
        startCamera();
    }
    
    // Handle step 3
    if (step === 3) {
        saveRegistration();
    }
}

// Start camera
async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });
        registerVideo.srcObject = currentStream;
    } catch (error) {
        showNotification('Gagal mengakses kamera: ' + error.message, 'error');
    }
}

// Toggle camera (front/back)
async function toggleCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    const facingMode = registerVideo.srcObject?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'environment' : 'user';
    
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: facingMode
            } 
        });
        registerVideo.srcObject = currentStream;
    } catch (error) {
        showNotification('Gagal menukar kamera', 'error');
    }
}

// Capture face
async function captureFace() {
    if (!modelsLoaded) {
        showNotification('Model masih dimuatkan...', 'error');
        return;
    }
    
    if (!registerVideo.srcObject) {
        showNotification('Kamera belum dimulakan', 'error');
        return;
    }
    
    try {
        // Detect face
        const detections = await faceapi.detectSingleFace(
            registerVideo,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            showNotification('Tiada muka dikesan. Sila cuba lagi.', 'error');
            return;
        }
        
        // Capture image
        registerCanvas.width = registerVideo.videoWidth;
        registerCanvas.height = registerVideo.videoHeight;
        registerCtx.drawImage(registerVideo, 0, 0);
        
        capturedImage = registerCanvas.toDataURL('image/jpeg');
        
        // Show preview
        document.getElementById('preview-image').src = capturedImage;
        document.querySelector('.camera-container').style.display = 'none';
        document.getElementById('capture-preview').style.display = 'block';
        
    } catch (error) {
        console.error('Error capturing face:', error);
        showNotification('Ralat semasa capture wajah', 'error');
    }
}

// Retake photo
function retakePhoto() {
    document.querySelector('.camera-container').style.display = 'block';
    document.getElementById('capture-preview').style.display = 'none';
    capturedImage = null;
}

// Save registration
function saveRegistration() {
    const name = document.getElementById('fullname').value;
    const id = document.getElementById('id-number').value;
    const email = document.getElementById('email').value;
    const department = document.getElementById('department').value;
    const position = document.getElementById('position').value;
    
    if (!name || !id || !email || !department) {
        showNotification('Sila isi semua maklumat', 'error');
        nextStep(1);
        return;
    }
    
    if (!capturedImage) {
        showNotification('Sila capture wajah anda', 'error');
        nextStep(2);
        return;
    }
    
    // Get face descriptor from captured image
    const img = new Image();
    img.src = capturedImage;
    img.onload = async () => {
        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            showNotification('Tiada muka dalam gambar', 'error');
            nextStep(2);
            return;
        }
        
        // Save to localStorage
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        
        const newUser = {
            id: id,
            name: name,
            email: email,
            department: department,
            position: position,
            descriptor: Array.from(detections.descriptor),
            registeredAt: new Date().toISOString(),
            image: capturedImage
        };
        
        registeredFaces.push(newUser);
        localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
        
        // Update confirmation page
        document.getElementById('confirm-name').textContent = name;
        document.getElementById('confirm-id').textContent = id;
        document.getElementById('confirm-dept').textContent = department;
        document.getElementById('confirm-date').textContent = formatDate();
        
        showNotification('Pendaftaran berjaya!', 'success');
        
        // Stop camera
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});
