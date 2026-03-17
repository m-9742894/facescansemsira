// Records page variables
let currentPage = 1;
const recordsPerPage = 10;
let filteredRecords = [];

// Load records on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    
    // Set today's date as default filter
    document.getElementById('filter-date').value = new Date().toISOString().split('T')[0];
});

// Load records from localStorage
function loadRecords() {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    filteredRecords = [...attendanceRecords].reverse(); // Show newest first
    
    updateSummary();
    displayRecords();
}

// Update summary cards
function updateSummary() {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const today = new Date().toDateString();
    
    const totalRecords = attendanceRecords.length;
    const todayRecords = attendanceRecords.filter(r => r.date === today).length;
    
    // Calculate average daily
    const uniqueDates = new Set(attendanceRecords.map(r => r.date)).size;
    const avgDaily = uniqueDates > 0 ? Math.round(totalRecords / uniqueDates) : 0;
    
    document.getElementById('total-records').textContent = totalRecords;
    document.getElementById('today-records').textContent = todayRecords;
    document.getElementById('avg-daily').textContent = avgDaily;
}

// Apply filters
function applyFilters() {
    const dateFilter = document.getElementById('filter-date').value;
    const deptFilter = document.getElementById('filter-department').value;
    const nameFilter = document.getElementById('filter-name').value.toLowerCase();
    
    const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    
    filteredRecords = allRecords.filter(record => {
        let match = true;
        
        if (dateFilter) {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            match = match && recordDate === dateFilter;
        }
        
        if (deptFilter) {
            // Get department from registered faces
            const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
            const user = registeredFaces.find(f => f.id === record.id);
            match = match && user?.department === deptFilter;
        }
        
        if (nameFilter) {
            match = match && record.name.toLowerCase().includes(nameFilter);
        }
        
        return match;
    }).reverse();
    
    currentPage = 1;
    displayRecords();
}

// Reset filters
function resetFilters() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-department').value = '';
    document.getElementById('filter-name').value = '';
    
    loadRecords();
}

// Display records with pagination
function displayRecords() {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = filteredRecords.slice(start, end);
    
    const tbody = document.getElementById('records-body');
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    
    if (pageRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--gray);"></i>
                    <p>Tiada rekod dijumpai</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageRecords.map((record, index) => {
            const recordDate = new Date(record.date);
            const isLate = record.time > '09:00:00'; // Contoh: lewat jika lepas 9 pagi
            
            return `
                <tr>
                    <td>${start + index + 1}</td>
                    <td>${record.name}</td>
                    <td>${record.id}</td>
                    <td>${getUserDepartment(record.id)}</td>
                    <td>${recordDate.toLocaleDateString('ms-MY')}</td>
                    <td>${record.time}</td>
                    <td>
                        <span class="status-badge ${isLate ? 'late' : 'present'}">
                            ${isLate ? 'Lewat' : 'Hadir'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="deleteRecord('${record.timestamp}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update pagination
    document.getElementById('page-info').textContent = `Halaman ${currentPage} dari ${totalPages || 1}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}

// Get user department from ID
function getUserDepartment(userId) {
    const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
    const user = registeredFaces.find(f => f.id === userId);
    return user?.department || '-';
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    }
    
    displayRecords();
}

// Delete record
let deleteTimestamp = null;

function deleteRecord(timestamp) {
    deleteTimestamp = timestamp;
    document.getElementById('delete-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deleteTimestamp = null;
}

function confirmDelete() {
    if (deleteTimestamp) {
        let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        attendanceRecords = attendanceRecords.filter(r => r.timestamp != deleteTimestamp);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        closeModal();
        loadRecords();
        showNotification('Rekod berjaya dipadam', 'success');
    }
}

// Export functions
function exportToCSV() {
    if (filteredRecords.length === 0) {
        showNotification('Tiada rekod untuk dieksport', 'error');
        return;
    }
    
    let csv = 'Nama,ID,Tarikh,Masa\n';
    filteredRecords.forEach(record => {
        csv += `${record.name},${record.id},${record.date},${record.time}\n`;
    });
    
    downloadFile(csv, 'attendance_records.csv', 'text/csv');
}

function exportToExcel() {
    if (filteredRecords.length === 0) {
        showNotification('Tiada rekod untuk dieksport', 'error');
        return;
    }
    
    // Simple CSV with .xls extension (works as basic Excel)
    let csv = 'Nama,ID,Tarikh,Masa\n';
    filteredRecords.forEach(record => {
        csv += `${record.name},${record.id},${record.date},${record.time}\n`;
    });
    
    downloadFile(csv, 'attendance_records.xls', 'application/vnd.ms-excel');
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

function printRecords() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Rekod Kehadiran</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4361ee; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #4361ee; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #dee2e6; }
                    .header { margin-bottom: 20px; }
                    .date { color: #6c757d; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Rekod Kehadiran</h1>
                    <p class="date">Dijana pada: ${formatDate()} ${formatTime()}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>ID</th>
                            <th>Tarikh</th>
                            <th>Masa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRecords.map(record => `
                            <tr>
                                <td>${record.name}</td>
                                <td>${record.id}</td>
                                <td>${record.date}</td>
                                <td>${record.time}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}
