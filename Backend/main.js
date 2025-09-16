const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx'); // Make sure this is here if you need it at the top
const database = require('./database.js');

// Get the correct, writable path for user data
const userDataPath = app.getPath('userData');
// Define the full path for our database file
const dbPath = path.join(userDataPath, 'attendance.db');
// Tell our database module to connect to this specific path
database.connect(dbPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'Frontend', 'index.html'));
}

// LOGIN HANDLER
ipcMain.handle('login', async (event, username, password) => {
  const db = database.getDb();
  const hashedPassword = database.hashPassword(password);
  return new Promise((resolve) => {
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, hashedPassword], (err, row) => {
      if (err) {
        console.error("Database error during login", err);
        resolve({ success: false, message: 'An error occurred.' });
      } else if (row) {
        resolve({ success: true });
      } else {
        resolve({ success: false, message: 'Invalid username or password.' });
      }
    });
  });
});

ipcMain.handle('get-dashboard-stats', async () => {
    const db = database.getDb();
    return new Promise((resolve, reject) => {
        // Get the first (and likely only) department
        db.get("SELECT * FROM departments LIMIT 1", [], async (err, department) => {
            if (err) return reject({ success: false, message: err.message });
            if (!department) return resolve({ success: true, deptName: "No Department Found", sectionCount: 0, studentCount: 0 });

            // Count sections in that department
            db.get("SELECT COUNT(*) as count FROM sections WHERE department_id = ?", [department.id], (err, sections) => {
                if (err) return reject({ success: false, message: err.message });

                // Count students in those sections
                const query = `
                    SELECT COUNT(*) as count 
                    FROM students 
                    WHERE section_id IN (SELECT id FROM sections WHERE department_id = ?)
                `;
                db.get(query, [department.id], (err, students) => {
                    if (err) return reject({ success: false, message: err.message });
                    resolve({
                        success: true,
                        deptName: department.name,
                        sectionCount: sections.count,
                        studentCount: students.count
                    });
                });
            });
        });
    });
});

// DEPARTMENT HANDLERS
ipcMain.handle('get-departments', async () => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM departments ORDER BY name", [], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

ipcMain.handle('add-department', async (event, name) => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO departments (name) VALUES (?)", [name], function(err) {
      if (err) reject({ success: false, message: err.message });
      resolve({ success: true, id: this.lastID });
    });
  });
});

// SECTION HANDLERS
ipcMain.handle('get-sections', async (event, departmentId) => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM sections WHERE department_id = ? ORDER BY semester, section_name", [departmentId], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

ipcMain.handle('add-section', async (event, { departmentId, semester, sectionName }) => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO sections (department_id, semester, section_name) VALUES (?, ?, ?)";
    db.run(query, [departmentId, semester, sectionName], function(err) {
      if (err) reject({ success: false, message: err.message });
      resolve({ success: true, id: this.lastID });
    });
  });
});

// STUDENT HANDLERS
ipcMain.handle('get-students', async (event, sectionId) => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM students WHERE section_id = ? ORDER BY usn", [sectionId], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

ipcMain.handle('add-student', async (event, { sectionId, usn, name }) => {
  const db = database.getDb();
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO students (section_id, usn, name) VALUES (?, ?, ?)";
    db.run(query, [sectionId, usn, name], function(err) {
      if (err) reject({ success: false, message: err.message });
      resolve({ success: true, id: this.lastID });
    });
  });
});

ipcMain.handle('get-subjects', async (event, sectionId) => {
  const db = database.getDb();
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM subjects WHERE section_id = ? ORDER BY code", [sectionId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
});

ipcMain.handle('add-subject', async (event, { sectionId, name, code }) => {
  const db = database.getDb();
    return new Promise((resolve, reject) => {
        const query = "INSERT INTO subjects (section_id, name, code) VALUES (?, ?, ?)";
        db.run(query, [sectionId, name, code], function(err) {
            if (err) reject({ success: false, message: err.message });
            resolve({ success: true, id: this.lastID });
        });
    });
});

// IMPORT STUDENTS FROM EXCEL
ipcMain.handle('import-students', async (event, { sectionId, filePath }) => {
  const db = database.getDb();
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const students = xlsx.utils.sheet_to_json(worksheet, { header: ['usn', 'name'] });

    if (students[0] && students[0].usn.toLowerCase() === 'usn') {
      students.shift(); // remove header
    }

    const stmt = db.prepare("INSERT OR IGNORE INTO students (section_id, usn, name) VALUES (?, ?, ?)");
    students.forEach(student => {
      if (student.usn && student.name) {
        stmt.run(sectionId, student.usn, student.name);
      }
    });
    stmt.finalize();

    return { success: true, count: students.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// FILE DIALOG HANDLER
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }]
  });
  return result.filePaths[0];
});

// NAVIGATION HANDLER
ipcMain.on('navigate', (event, page) => {
  mainWindow.loadFile(path.join(__dirname, '..', 'Frontend', page));
});

// ATTENDANCE HANDLER
ipcMain.handle('save-attendance', async (event, { sectionId, subjectId, date, absentStudentIds }) => {
    return new Promise((resolve, reject) => {
        const db = database.getDb();
        // First, get all students in the section
        db.all("SELECT id FROM students WHERE section_id = ?", [sectionId], (err, students) => {
            if (err) return reject({ success: false, message: err.message });

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                // UPDATED: Delete query now includes subject_id to only remove records for that specific subject on that day
                const deleteQuery = `
                    DELETE FROM attendance 
                    WHERE student_id IN (SELECT id FROM students WHERE section_id = ?) 
                    AND subject_id = ? 
                    AND date = ?`;
                db.run(deleteQuery, [sectionId, subjectId, date]);

                // UPDATED: Insert statements now include the subject_id
                const presentStmt = db.prepare("INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, 'Present')");
                const absentStmt = db.prepare("INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, 'Absent')");

                students.forEach(student => {
                    if (absentStudentIds.includes(student.id)) {
                        absentStmt.run(student.id, subjectId, date);
                    } else {
                        presentStmt.run(student.id, subjectId, date);
                    }
                });

                presentStmt.finalize();
                absentStmt.finalize();
                db.run("COMMIT", (commitErr) => {
                    if (commitErr) return reject({ success: false, message: commitErr.message });
                    resolve({ success: true });
                });
            });
        });
    });
});

// DAILY ATTENDANCE HANDLER
ipcMain.handle('get-daily-attendance', async (event, { sectionId, subjectId, date }) => {
    const db = database.getDb();
    const query = `
        SELECT s.usn, s.name, a.status
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ? AND a.subject_id = ?
        WHERE s.section_id = ?
        ORDER BY s.usn
    `;
    return new Promise((resolve, reject) => {
        db.all(query, [date, subjectId, sectionId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
});

// ATTENDANCE SUMMARY HANDLER
ipcMain.handle('get-attendance-summary', async (event, { sectionId, subjectId, startDate, endDate }) => {
    const db = database.getDb();
    const query = `
        SELECT
            s.usn,
            s.name,
            COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as attended_classes,
            COUNT(a.id) as total_classes
        FROM students s
        JOIN attendance a ON s.id = a.student_id
        WHERE s.section_id = ? AND a.subject_id = ? AND a.date BETWEEN ? AND ?
        GROUP BY s.id
        ORDER BY s.usn
    `;
    return new Promise((resolve, reject) => {
        db.all(query, [sectionId, subjectId, startDate, endDate], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
});

// --- NEW HANDLERS ---

// Backup DB
ipcMain.handle('backup-database', async () => {
  const dbPath = path.resolve(app.getAppPath(), 'data', 'attendance.db');
  const result = await dialog.showSaveDialog({
    title: 'Save Database Backup',
    defaultPath: `attendance-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.copyFileSync(dbPath, result.filePath);
      return { success: true, message: `Backup saved to ${result.filePath}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  return { success: false, message: 'Backup canceled.' };
});

// Restore DB
ipcMain.handle('restore-database', async () => {
  const dbPath = path.resolve(app.getAppPath(), 'data', 'attendance.db');
  const result = await dialog.showOpenDialog({
    title: 'Select Backup to Restore',
    properties: ['openFile'],
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const backupPath = result.filePaths[0];
    return new Promise(resolve => {
      database.closeDb((err) => {
        if (err) return resolve({ success: false, message: err.message });

        try {
          fs.copyFileSync(backupPath, dbPath);
          resolve({ success: true });
          app.relaunch();
          app.quit();
        } catch (error) {
          database.connectDb(); // Reconnect if restore failed
          resolve({ success: false, message: error.message });
        }
      });
    });
  }
  return { success: false, message: 'Restore canceled.' };
});

// Change Password
ipcMain.handle('change-password', async (event, { currentPassword, newPassword }) => {
  const db = database.getDb();
  const hashedCurrent = database.hashPassword(currentPassword);

  return new Promise((resolve) => {
    // FIX: Check for the correct username 'admin' instead of 'attender'
    db.get("SELECT * FROM users WHERE username = 'admin' AND password = ?", [hashedCurrent], (err, row) => {
      if (err) return resolve({ success: false, message: err.message });
      if (!row) return resolve({ success: false, message: "Current password does not match." });

      const hashedNew = database.hashPassword(newPassword);
      // FIX: Update the password for the correct username 'admin'
      db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hashedNew], (updateErr) => {
        if (updateErr) return resolve({ success: false, message: updateErr.message });
        resolve({ success: true, message: "Password updated successfully." });
      });
    });
  });
});

// Add these new IPC handlers to Backend/main.js

ipcMain.handle('get-signature', async () => {
    const db = database.getDb();
    return new Promise((resolve) => {
        db.get("SELECT signature_image FROM settings WHERE id = 1", [], (err, row) => {
            resolve(row ? row.signature_image : null);
        });
    });
});

ipcMain.handle('save-signature', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Select Signature Image',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileData = fs.readFileSync(filePath);
        const base64Image = `data:image/${path.extname(filePath).slice(1)};base64,${fileData.toString('base64')}`;
        
        const db = database.getDb();
        db.run("INSERT OR REPLACE INTO settings (id, signature_image) VALUES (1, ?)", [base64Image]);
        return { success: true, image: base64Image };
    }
    return { success: false };
});

ipcMain.handle('remove-signature', async () => {
    const db = database.getDb();
    db.run("UPDATE settings SET signature_image = NULL WHERE id = 1");
    return { success: true };
});

ipcMain.handle('get-logo', () => {
    const logoPath = path.join(__dirname, '..', 'Frontend', 'assets', 'images', 'logo.png');
    try {
        const fileData = fs.readFileSync(logoPath);
        return `data:image/png;base64,${fileData.toString('base64')}`;
    } catch (error) {
        console.error("Could not read logo file:", error);
        return null;
    }
});

// APP LIFECYCLE
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
    database.closeDb();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
