const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// The 'db' variable will be initialized by the connect function
let db;

/**
 * Connects to the SQLite database at the specified path.
 * This is called once from main.js with a safe, writable path.
 * @param {string} dbPath - The full file path to the database.
 */
function connect(dbPath) {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error opening database", err.message);
        } else {
            console.log("Connected to the SQLite database at:", dbPath);
            initializeDb();
        }
    });
}

/**
 * Closes the database connection.
 * @param {function} callback - An optional callback to run after closing.
 */
function closeDb(callback) {
    if (db) {
        db.close(callback);
    }
}

/**
 * Returns the active database instance.
 * @returns {sqlite3.Database} The database instance.
 */
function getDb() {
    return db;
}

/**
 * Hashes a password using a consistent salt.
 * @param {string} password - The plain-text password.
 * @returns {string} The hashed password.
 */
function hashPassword(password) {
    const salt = 'some-random-salt'; // In a real app, use a per-user salt
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

/**
 * Creates all necessary tables if they don't exist and adds a default user.
 */
function initializeDb() {
    db.serialize(() => {
        // Create 'users' table and add a default user
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (!err) {
                // Add default user only if the table is empty
                db.get("SELECT count(*) as count FROM users", (err, row) => {
                    if (row && row.count === 0) {
                        const defaultUsername = 'admin'; // Your specified username
                        const defaultPassword = 'admin@123'; // Your specified password
                        const hashedPassword = hashPassword(defaultPassword);
                        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [defaultUsername, hashedPassword], (err) => {
                            if (err) console.error("Error inserting default user", err);
                            else console.log(`Default user '${defaultUsername}' created.`);
                        });
                    }
                });
            }
        });

        // Create 'settings' table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            institute_name TEXT,
            signature_image TEXT 
        )`);

        // Create 'departments' table
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);

        // Create 'sections' table
        db.run(`CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER,
            semester INTEGER NOT NULL,
            section_name TEXT NOT NULL,
            FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
        )`);

        // Create 'subjects' table
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER,
            name TEXT NOT NULL,
            code TEXT,
            FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE
        )`);

        // Create 'students' table
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER,
            usn TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE
        )`);
        
        // Create 'attendance' table
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id INTEGER,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
        )`);
    });
}

// Export the necessary functions for main.js to use
module.exports = {
    connect,
    getDb,
    hashPassword,
    closeDb
};