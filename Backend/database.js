// Backend/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '..', 'data', 'attendance.db');
let db;

// Function to connect to the database
function connectDb() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error opening database", err.message);
        } else {
            console.log("Connected to the SQLite database.");
            initializeDb();
        }
    });
}

// Function to close the database connection
function closeDb(callback) {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error("Error closing database", err.message);
            } else {
                console.log("Database connection closed.");
            }
            if (callback) callback(err);
        });
    }
}

// Function to get the current db instance
function getDb() {
    return db;
}

// Function to hash passwords
function hashPassword(password) {
    const salt = 'some-random-salt'; // In a real app, use a per-user salt
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Function to initialize the database schema
function initializeDb() {
    db.serialize(() => {
        // Create 'users' table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating users table", err);
            } else {
                // Add default user if not exists
                const defaultUsername = 'admin';
                db.get("SELECT * FROM users WHERE username = ?", [defaultUsername], (err, row) => {
                    if (err) {
                        console.error("Error checking for default user", err);
                    } else if (!row) {
                        const defaultPassword = 'admin@123';
                        const hashedPassword = hashPassword(defaultPassword);
                        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [defaultUsername, hashedPassword], (err) => {
                            if (err) {
                                console.error("Error inserting default user", err);
                            } else {
                                console.log("Default user 'admin' created with password 'Test@123'");
                            }
                        });
                    }
                });
            }
        });

        // Create 'departments' table
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`, (err) => {
            if (err) {
                console.error("Error creating departments table", err);
            }
        });

        // Create 'sections' table
        db.run(`CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER,
            semester INTEGER NOT NULL,
            section_name TEXT NOT NULL,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )`, (err) => {
            if (err) {
                console.error("Error creating sections table", err);
            }
        });

        // Create 'students' table
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER,
            usn TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            FOREIGN KEY (section_id) REFERENCES sections (id)
        )`, (err) => {
            if (err) {
                console.error("Error creating students table", err);
            }
        });

        // Create subjects table
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER,
            name TEXT NOT NULL,
            code TEXT,
            FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE
        )`);

        // Create 'attendance' table
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id INTEGER, -- ADD THIS COLUMN
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
        )`);

        // Inside the initializeDb function in database.js
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            institute_name TEXT,
            signature_image TEXT 
)`);
    });
}

// Initial connection
connectDb();

// Export database management functions
module.exports = {
    getDb,
    hashPassword,
    closeDb,
    connectDb
};
