# LAMS - Lab Attendance Management System

<img width="1919" height="951" alt="image" src="https://github.com/user-attachments/assets/8af59860-6949-4bf7-80da-4d87c6b20e99" />
<img width="1919" height="960" alt="image" src="https://github.com/user-attachments/assets/2b1ec742-6615-410c-9f63-4c8dc521e422" />
<img width="1919" height="962" alt="image" src="https://github.com/user-attachments/assets/79d5e404-f8c1-419c-a9a2-51435b19116a" />
<img width="1919" height="954" alt="image" src="https://github.com/user-attachments/assets/fe2c2b8a-2d55-4c15-9d95-df741e065c42" />
<img width="1919" height="965" alt="image" src="https://github.com/user-attachments/assets/81ad9219-2e1b-4f12-bdfc-c5ac78641d97" />

A secure, offline-first desktop application built with **Electron** and **Node.js** to digitize and automate the process of tracking student lab attendance, generating professional reports, and managing class data for educational institutions.

## ✨ Features

* **Offline First:** Designed to run 100% offline, requiring no internet connection in the lab environment.
* **Secure Login:** A simple and secure login system for the lab attender.
* **Complete Data Management:**
    * Easily manage Departments, Sections, Subjects, and Students.
    * **Excel Import:** Bulk-import student lists from an Excel (`.xlsx`) file to save time.
* **Quick Attendance Marking:** An intuitive interface to quickly mark absentees for any subject and date.
* **Professional PDF Reports:**
    * Generate **Daily Attendance Reports** showing present and absent students.
    * Generate end-of-semester **Shortage Lists** with automatic fine calculations.
    * Include the official college logo and a digital signature on all reports.
* **Data Safety:** A robust **Backup and Restore** feature to ensure no data is ever lost.
* **Modern UI:** A clean, professional, and user-friendly interface built with modern web technologies.

## 🛠️ Tech Stack

* **Framework:** Electron.js
* **Database:** SQLite (for offline storage)
* **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
* **PDF Generation:** jsPDF & jsPDF-AutoTable
* **Excel Parsing:** SheetJS (xlsx)
* **Packaging:** Electron Builder

## 🚀 Setup and Installation

To run this project in a development environment:

1.  Clone the repository:
    ```bash
    git clone [https://github.com/YourUsername/YourRepositoryName.git](https://github.com/YourUsername/YourRepositoryName.git)
    cd YourRepositoryName
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the application:
    ```bash
    npm start
    ```

To build the distributable installer, run:
```bash
npm run package
