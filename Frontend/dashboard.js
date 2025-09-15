document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    const logoutBtn = document.getElementById('logoutBtn');

    function showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        // Show the notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Hide and remove the notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // --- View Loader ---
    async function loadView(viewName) {
        try {
            const response = await fetch(`views/${viewName}.html`);
            mainContent.innerHTML = await response.text();

            // Router to run the correct logic
            if (viewName === 'home') {
                loadHomeLogic();
            } else if (viewName === 'manage-classes') {
                loadClassesLogic();
            } else if (viewName === 'take-attendance') {
                loadAttendanceLogic();
            } else if (viewName === 'generate-reports') {
                loadReportsLogic();
            } else if (viewName === 'settings') {
                loadSettingsLogic();
            }
        } catch (error) {
            mainContent.innerHTML = `<p>Error loading view: ${error.message}</p>`;
        }
    }

    function loadHomeLogic() {
        const deptNameHeader = document.getElementById('deptNameHeader');
        const sectionCountEl = document.getElementById('sectionCount');
        const studentCountEl = document.getElementById('studentCount');
        const quickActionAttendance = document.getElementById('quickActionAttendance');
        const quickActionReports = document.getElementById('quickActionReports');

        // Fetch and display stats
        window.api.getDashboardStats().then(stats => {
            if (stats.success) {
                deptNameHeader.textContent = `Department of ${stats.deptName}`;
                sectionCountEl.textContent = stats.sectionCount;
                studentCountEl.textContent = stats.studentCount;
            }
        });

        // Wire up quick action buttons to click the sidebar links
        quickActionAttendance.addEventListener('click', () => {
            document.querySelector('.nav-item[data-view="take-attendance"]').click();
        });
        quickActionReports.addEventListener('click', () => {
            document.querySelector('.nav-item[data-view="generate-reports"]').click();
        });
    }


    // --- Take Attendance Logic ---
    function loadAttendanceLogic() {
        const deptSelect = document.getElementById('deptSelect');
        const sectionSelect = document.getElementById('sectionSelect');
        const subjectSelect = document.getElementById('subjectSelect');
        const attendanceDate = document.getElementById('attendanceDate');
        const loadStudentsBtn = document.getElementById('loadStudentsBtn');
        const studentListContainer = document.getElementById('studentListContainer');
        const studentChecklist = document.getElementById('studentChecklist');
        const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

        // Set today's date by default
        attendanceDate.valueAsDate = new Date();

        // 1. Populate Departments Dropdown
        async function populateDepartments() {
            const departments = await window.api.getDepartments();
            deptSelect.innerHTML = '<option value="">-- Select Department --</option>'; // Clear and add default
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                deptSelect.appendChild(option);
            });
        }

        // 2. When Department changes, populate Sections Dropdown
        deptSelect.addEventListener('change', async () => {
            const deptId = deptSelect.value;
            // Reset both sections and subjects
            sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
            sectionSelect.disabled = true;
            subjectSelect.disabled = true;
            loadStudentsBtn.disabled = true;
            studentListContainer.style.display = 'none';

            if (deptId) {
                const sections = await window.api.getSections(deptId);
                sections.forEach(sec => {
                    const option = document.createElement('option');
                    option.value = sec.id;
                    option.textContent = `Sem ${sec.semester}, Sec ${sec.section_name}`;
                    sectionSelect.appendChild(option);
                });
                sectionSelect.disabled = false;
            }
        });

        sectionSelect.addEventListener('change', () => {
            loadStudentsBtn.disabled = !sectionSelect.value;
            studentListContainer.style.display = 'none';
        });

        // 3. NEW: When Section changes, populate Subjects
        sectionSelect.addEventListener('change', async () => {
            const sectionId = sectionSelect.value;
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
            subjectSelect.disabled = true;
            loadStudentsBtn.disabled = true;
            studentListContainer.style.display = 'none';

            if (sectionId) {
                const subjects = await window.api.getSubjects(sectionId);
                subjects.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = `${sub.code} - ${sub.name}`;
                    subjectSelect.appendChild(option);
                });
                subjectSelect.disabled = false;
            }
        });

        subjectSelect.addEventListener('change', () => {
            loadStudentsBtn.disabled = !subjectSelect.value;
            studentListContainer.style.display = 'none';
        });

        // 3. When "Load Students" is clicked, show the checklist
        loadStudentsBtn.addEventListener('click', async () => {
            const sectionId = sectionSelect.value;
            if (!sectionId) return;

            const students = await window.api.getStudents(sectionId);
            studentChecklist.innerHTML = ''; // Clear previous list
            students.forEach(student => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <label>
                        <input type="checkbox" data-studentid="${student.id}">
                        ${student.usn} - ${student.name}
                    </label>
                `;
                studentChecklist.appendChild(li);
            });
            studentListContainer.style.display = 'block';
        });

        // 4. When "Save Attendance" is clicked, send data to the backend
        saveAttendanceBtn.addEventListener('click', async () => {
            const sectionId = sectionSelect.value;
            const subjectId = subjectSelect.value; // Get subjectId
            const date = attendanceDate.value;

            if (!sectionId || !subjectId || !date) { // Check for subjectId
                return showNotification('Please select a department, section, subject, and date.', 'error');
            }

            const absentCheckboxes = studentChecklist.querySelectorAll('input[type="checkbox"]:checked');
            const absentStudentIds = Array.from(absentCheckboxes).map(cb => parseInt(cb.dataset.studentid));

            // Pass the new subjectId to the backend
            const result = await window.api.saveAttendance({ sectionId, subjectId, date, absentStudentIds });

            if (result.success) {
                showNotification('Attendance saved successfully!');
            } else {
                showNotification(`Error saving attendance: ${result.message}`, 'error');
            }
        });

        populateDepartments();
    }

    // --- Class Management Logic ---
    function loadClassesLogic() {
        let selectedDepartmentId = null;
        let selectedSectionId = null;

        // --- Get all UI elements ---
        // Columns
        const sectionsContainer = document.getElementById('sectionsContainer');
        const detailsColumn = document.getElementById('detailsColumn');
        // Department elements
        const addDeptBtn = document.getElementById('addDepartmentBtn');
        const deptNameInput = document.getElementById('departmentName');
        const deptList = document.getElementById('departmentList');
        const selectedDeptNameSpan = document.getElementById('selectedDeptName');
        // Section elements
        const addSectionBtn = document.getElementById('addSectionBtn');
        const semesterInput = document.getElementById('semester');
        const sectionNameInput = document.getElementById('sectionName');
        const sectionList = document.getElementById('sectionList');
        const selectedSectionNameSpan = document.getElementById('selectedSectionName');
        // Subject elements
        const addSubjectBtn = document.getElementById('addSubjectBtn');
        const subjectCodeInput = document.getElementById('subjectCode');
        const subjectNameInput = document.getElementById('subjectName');
        const subjectList = document.getElementById('subjectList');
        // Student elements
        const addStudentBtn = document.getElementById('addStudentBtn');
        const studentUsnInput = document.getElementById('studentUsn');
        const studentNameInput = document.getElementById('studentName');
        const importStudentsBtn = document.getElementById('importStudentsBtn');
        const studentList = document.getElementById('studentList');

        // --- Logic Functions ---
        async function refreshDepartments() {
            const departments = await window.api.getDepartments();
            deptList.innerHTML = '';
            departments.forEach(dept => {
                const li = document.createElement('li');
                li.textContent = dept.name;
                li.dataset.id = dept.id;
                li.className = 'list-item';
                li.addEventListener('click', () => {
                    // When a department is clicked...
                    selectedDepartmentId = dept.id;
                    selectedDeptNameSpan.textContent = dept.name;
                    sectionsContainer.style.display = 'block';
                    detailsColumn.style.display = 'none'; // Hide details column
                    document.querySelectorAll('#departmentList .list-item').forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');
                    refreshSections();
                });
                deptList.appendChild(li);
            });
        }

        async function refreshSections() {
            if (!selectedDepartmentId) return;
            const sections = await window.api.getSections(selectedDepartmentId);
            sectionList.innerHTML = '';
            sections.forEach(sec => {
                const li = document.createElement('li');
                li.textContent = `Semester ${sec.semester}, Section ${sec.section_name}`;
                li.dataset.id = sec.id;
                li.className = 'list-item';
                li.addEventListener('click', () => {
                    // When a section is clicked...
                    selectedSectionId = sec.id;
                    selectedSectionNameSpan.textContent = li.textContent;
                    detailsColumn.style.display = 'block'; // Show details column
                    document.querySelectorAll('#sectionList .list-item').forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');
                    // Refresh both subjects and students for this section
                    refreshSubjects();
                    refreshStudents();
                });
                sectionList.appendChild(li);
            });
        }

        // NEW: Function to refresh the subjects list
        async function refreshSubjects() {
            if (!selectedSectionId) return;
            const subjects = await window.api.getSubjects(selectedSectionId);
            subjectList.innerHTML = '';
            subjects.forEach(sub => {
                const li = document.createElement('li');
                li.textContent = `${sub.code} - ${sub.name}`;
                subjectList.appendChild(li);
            });
        }

        async function refreshStudents() {
            if (!selectedSectionId) return;
            const students = await window.api.getStudents(selectedSectionId);
            studentList.innerHTML = '';
            students.forEach(stud => {
                const li = document.createElement('li');
                li.textContent = `${stud.usn} - ${stud.name}`;
                studentList.appendChild(li);
            });
        }

        // Add Department
        addDeptBtn.addEventListener('click', async () => {
            const name = deptNameInput.value.trim();
            if (name) {
                await window.api.addDepartment(name);
                deptNameInput.value = '';
                refreshDepartments();
            }
        });

        // Add Section
        addSectionBtn.addEventListener('click', async () => {
            const semester = semesterInput.value;
            const sectionName = sectionNameInput.value.trim();
            if (selectedDepartmentId && semester && sectionName) {
                await window.api.addSection({ departmentId: selectedDepartmentId, semester, sectionName });
                semesterInput.value = '';
                sectionNameInput.value = '';
                refreshSections();
            }
        });

        // Add Student
        addStudentBtn.addEventListener('click', async () => {
            const usn = studentUsnInput.value.trim();
            const name = studentNameInput.value.trim();
            if (selectedSectionId && usn && name) {
                await window.api.addStudent({ sectionId: selectedSectionId, usn, name });
                studentUsnInput.value = '';
                studentNameInput.value = '';
                refreshStudents();
            }
        });

        // Import Students
        importStudentsBtn.addEventListener('click', async () => {
            const filePath = await window.api.openFileDialog();
            if (filePath && selectedSectionId) {
                const result = await window.api.importStudents({ sectionId: selectedSectionId, filePath });
                if (result.success) {
                    showNotification(`${result.count} students imported successfully!`);
                    refreshStudents();
                } else {
                    showNotification(`Import failed: ${result.message}`, 'error');
                }
            }
        });

        addSubjectBtn.addEventListener('click', async () => {
            const name = subjectNameInput.value.trim();
            const code = subjectCodeInput.value.trim();
            if (selectedSectionId && name && code) {
                await window.api.addSubject({ sectionId: selectedSectionId, name, code });
                subjectNameInput.value = '';
                subjectCodeInput.value = '';
                refreshSubjects(); // Refresh the list
            }
        });

        // Initial department load
        refreshDepartments();
    }

    function loadReportsLogic() {
        const COLLEGE_NAME = "Maharaja Institute of Technology Mysore";

        // --- UI Elements ---
        const dailyDeptSelect = document.getElementById('dailyDeptSelect');
        const dailySectionSelect = document.getElementById('dailySectionSelect');
        const dailySubjectSelect = document.getElementById('dailySubjectSelect');
        const dailyDate = document.getElementById('dailyDate');
        const generateDailyReportBtn = document.getElementById('generateDailyReportBtn');

        const shortageDeptSelect = document.getElementById('shortageDeptSelect');
        const shortageSectionSelect = document.getElementById('shortageSectionSelect');
        const shortageSubjectSelect = document.getElementById('shortageSubjectSelect');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const generateShortageReportBtn = document.getElementById('generateShortageReportBtn');

        // --- Set default dates ---
        dailyDate.valueAsDate = new Date();
        endDate.valueAsDate = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        startDate.valueAsDate = oneMonthAgo;

        // --- Helper: Populate Dropdowns ---
        async function setupDropdowns(deptSelect, sectionSelect, subjectSelect) {
            deptSelect.innerHTML = '<option value="">-- Select Department --</option>';
            const departments = await window.api.getDepartments();
            departments.forEach(dept => deptSelect.add(new Option(dept.name, dept.id)));

            deptSelect.addEventListener('change', async () => {
                sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
                subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
                sectionSelect.disabled = true;
                subjectSelect.disabled = true;
                if (deptSelect.value) {
                    const sections = await window.api.getSections(deptSelect.value);
                    sections.forEach(sec => sectionSelect.add(new Option(`Sem ${sec.semester}, Sec ${sec.section_name}`, sec.id)));
                    sectionSelect.disabled = false;
                }
            });

            sectionSelect.addEventListener('change', async () => {
                subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
                subjectSelect.disabled = true;
                if (sectionSelect.value) {
                    const subjects = await window.api.getSubjects(sectionSelect.value);
                    subjects.forEach(sub => subjectSelect.add(new Option(`${sub.code} - ${sub.name}`, sub.id)));
                    subjectSelect.disabled = false;
                }
            });
        }

        // Initialize dropdowns
        setupDropdowns(dailyDeptSelect, dailySectionSelect, dailySubjectSelect);
        setupDropdowns(shortageDeptSelect, shortageSectionSelect, shortageSubjectSelect);

        // --- PDF Generation Logic ---
        // Header only (Updated to only handle header logic)
        async function generatePdfHeader(doc, title, deptName, subjectName, dateText) {
            const logoBase64 = await window.api.getLogo();
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 14, 15, 20, 20);
            }
            const textStartX = logoBase64 ? 40 : 14;
            doc.setFontSize(18);
            doc.text(COLLEGE_NAME, textStartX, 22);
            doc.setFontSize(14);
            doc.text(`Department of ${deptName}`, textStartX, 30);
            doc.text(`Subject: ${subjectName}`, 14, 38);
            doc.setFontSize(16);
            doc.text(title, 105, 48, { align: 'center' });
            doc.setFontSize(12);
            doc.text(dateText, 14, 56);
        }

        // Signature only (No changes needed)
        async function addSignatureToPdf(doc) {
            const signatureImage = await window.api.getSignature();
            if (signatureImage) {
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 15;
                const signatureWidth = 40;
                const imgProps = doc.getImageProperties(signatureImage);
                const aspectRatio = imgProps.height / imgProps.width;
                const signatureHeight = signatureWidth * aspectRatio;
                let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 60;
                let y = finalY + 15;
                if (y + signatureHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
                const x = pageWidth - margin - signatureWidth;
                doc.addImage(signatureImage, 'PNG', x, y, signatureWidth, signatureHeight);
                doc.setLineWidth(0.2);
                doc.line(x, y + signatureHeight + 2, x + signatureWidth, y + signatureHeight + 2);
                doc.setFontSize(8);
                doc.text("Signature", x + signatureWidth / 2, y + signatureHeight + 6, { align: 'center' });
            }
        }

        // --- Daily Report ---
        generateDailyReportBtn.addEventListener('click', async () => {
            const sectionId = dailySectionSelect.value;
            const subjectId = dailySubjectSelect.value;
            const date = dailyDate.value;
            if (!sectionId || !subjectId || !date) return showNotification("Please select all fields.", 'error');

            const data = await window.api.getDailyAttendance({ sectionId, subjectId, date });
            const doc = new window.jspdf.jsPDF();
            const deptName = dailyDeptSelect.options[dailyDeptSelect.selectedIndex].text;
            const subjectName = dailySubjectSelect.options[dailySubjectSelect.selectedIndex].text;

            // STEP 1: Header
            await generatePdfHeader(doc, "Daily Attendance Report", deptName, subjectName, `Date: ${date}`);

            // STEP 2: Tables
            const present = data.filter(s => s.status === 'Present').map(s => [s.usn, s.name]);
            const absent = data.filter(s => s.status !== 'Present').map(s => [s.usn, s.name]);

            doc.autoTable({
                head: [['Present Students', `Total: ${present.length}`]],
                startY: 65,
                theme: 'grid',
                headStyles: { fillColor: [40, 167, 69] }
            });

            doc.autoTable({
                head: [['USN', 'Name']],
                body: present,
                startY: doc.lastAutoTable.finalY,
                theme: 'striped'
            });

            doc.autoTable({
                head: [['Absent Students', `Total: ${absent.length}`]],
                startY: doc.lastAutoTable.finalY + 10,
                theme: 'grid',
                headStyles: { fillColor: [220, 53, 69] }
            });

            doc.autoTable({
                head: [['USN', 'Name']],
                body: absent,
                startY: doc.lastAutoTable.finalY,
                theme: 'striped'
            });

            // STEP 3: Signature (at the very end)
            await addSignatureToPdf(doc);

            doc.save(`Daily_Report_${subjectName}_${date}.pdf`);
        });

        // --- Shortage Report ---
        generateShortageReportBtn.addEventListener('click', async () => {
            const sectionId = shortageSectionSelect.value;
            const subjectId = shortageSubjectSelect.value;
            if (!sectionId || !subjectId || !startDate.value || !endDate.value) return showNotification("Please select all fields.", 'error');

            const summary = await window.api.getAttendanceSummary({
                sectionId,
                subjectId,
                startDate: startDate.value,
                endDate: endDate.value
            });

            const doc = new window.jspdf.jsPDF();
            const deptName = shortageDeptSelect.options[shortageDeptSelect.selectedIndex].text;
            const subjectName = shortageSubjectSelect.options[shortageSubjectSelect.selectedIndex].text;
            const dateRange = `From ${startDate.value} To ${endDate.value}`;

            // STEP 1: Header
            await generatePdfHeader(doc, "Attendance Shortage Report", deptName, subjectName, dateRange);

            // STEP 2: Tables
            const below85 = [];
            const below75 = [];

            summary.forEach(s => {
                const percentage = (s.attended_classes / s.total_classes) * 100;
                const row = [s.usn, s.name, s.attended_classes, s.total_classes, `${percentage.toFixed(2)}%`];
                if (percentage < 75) {
                    below75.push([...row, '₹ 500']);
                } else if (percentage < 85) {
                    below85.push([...row, '₹ 200']);
                }
            });

            doc.autoTable({
                head: [['Students with Attendance < 85% (Fine: ₹ 200)']],
                startY: 65,
                theme: 'grid',
                headStyles: { fillColor: [255, 193, 7] }
            });

            doc.autoTable({
                head: [['USN', 'Name', 'Attended', 'Total', 'Percentage', 'Fine']],
                body: below85,
                startY: doc.lastAutoTable.finalY,
                theme: 'striped'
            });

            doc.autoTable({
                head: [['Students with Attendance < 75% (Fine: ₹ 500)']],
                startY: doc.lastAutoTable.finalY + 10,
                theme: 'grid',
                headStyles: { fillColor: [220, 53, 69] }
            });

            doc.autoTable({
                head: [['USN', 'Name', 'Attended', 'Total', 'Percentage', 'Fine']],
                body: below75,
                startY: doc.lastAutoTable.finalY,
                theme: 'striped'
            });

            // STEP 3: Signature (at the very end)
            await addSignatureToPdf(doc);

            doc.save(`Shortage_Report_${subjectName}.pdf`);
        });
    }


    function loadSettingsLogic() {
        // --- Existing Logic ---

        const backupBtn = document.getElementById('backupBtn');
        const restoreBtn = document.getElementById('restoreBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');

        backupBtn.addEventListener('click', async () => {
            const result = await window.api.backupDatabase();
            showNotification(result.message, result.success ? 'success' : 'error');
        });

        restoreBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to restore from a backup? This will overwrite all current data and restart the application.")) {
                window.api.restoreDatabase();
            }
        });

        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                return showNotification("Please fill in all password fields.", 'error');
            }
            if (newPassword !== confirmPassword) {
                return showNotification("New passwords do not match.", 'error');
            }

            const result = await window.api.changePassword({ currentPassword, newPassword });
            showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                // Clear fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            }
        });

        // --- NEW Signature Logic ---

        const uploadSignatureBtn = document.getElementById('uploadSignatureBtn');
        const removeSignatureBtn = document.getElementById('removeSignatureBtn');
        const signaturePreview = document.getElementById('signaturePreview');
        const noSignatureText = document.getElementById('noSignatureText');

        function updateSignaturePreview(imageData) {
            if (imageData) {
                signaturePreview.src = imageData;
                signaturePreview.style.display = 'block';
                removeSignatureBtn.style.display = 'inline-block';
                noSignatureText.style.display = 'none';
            } else {
                signaturePreview.src = '';
                signaturePreview.style.display = 'none';
                removeSignatureBtn.style.display = 'none';
                noSignatureText.style.display = 'block';
            }
        }

        // Load initial signature on page load
        window.api.getSignature().then(updateSignaturePreview);

        uploadSignatureBtn.addEventListener('click', async () => {
            const result = await window.api.saveSignature();
            if (result.success) {
                updateSignaturePreview(result.image);
                showNotification('Signature updated successfully!', 'success');
            } else {
                showNotification(result.message || 'Failed to update signature.', 'error');
            }
        });

        removeSignatureBtn.addEventListener('click', async () => {
            await window.api.removeSignature();
            updateSignaturePreview(null);
            showNotification('Signature removed.', 'success');
        });
    }


    // --- CORRECTED Navigation and Logout Logic ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove 'active' class from all links
            navLinks.forEach(item => item.classList.remove('active'));
            // Add 'active' class to the clicked link
            link.classList.add('active');

            // Get the view name from the data-view attribute and load it
            const viewName = link.dataset.view;
            loadView(viewName);
        });
    });


    logoutBtn.addEventListener('click', () => {
        window.api.navigate('index.html');
    });

    // Load default view
    document.querySelector('.nav-item[data-view="home"]').click();
});
