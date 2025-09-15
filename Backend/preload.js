// Backend/preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (username, password) => ipcRenderer.invoke('login', username, password),
  saveAttendance: (data) => ipcRenderer.invoke('save-attendance', data),
  getDailyAttendance: (data) => ipcRenderer.invoke('get-daily-attendance', data),
  getAttendanceSummary: (data) => ipcRenderer.invoke('get-attendance-summary', data),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  changePassword: (passwords) => ipcRenderer.invoke('change-password', passwords),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getSignature: () => ipcRenderer.invoke('get-signature'),
  saveSignature: () => ipcRenderer.invoke('save-signature'),
  removeSignature: () => ipcRenderer.invoke('remove-signature'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  getDepartments: () => ipcRenderer.invoke('get-departments'),
  addDepartment: (name) => ipcRenderer.invoke('add-department', name),
  getSections: (departmentId) => ipcRenderer.invoke('get-sections', departmentId),
  addSection: (data) => ipcRenderer.invoke('add-section', data),
  getStudents: (sectionId) => ipcRenderer.invoke('get-students', sectionId),
  addStudent: (data) => ipcRenderer.invoke('add-student', data),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  importStudents: (data) => ipcRenderer.invoke('import-students', data),
  getSubjects: (sectionId) => ipcRenderer.invoke('get-subjects', sectionId),
  addSubject: (data) => ipcRenderer.invoke('add-subject', data),
  getLogo: () => ipcRenderer.invoke('get-logo'),
});