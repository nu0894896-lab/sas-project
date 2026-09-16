CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'teacher', 'student'
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    device_identifier VARCHAR(255) UNIQUE NOT NULL,
    device_model VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    proximity_token VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_id, student_id)
);

-- Default Initial Accounts
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) 
VALUES (1, 'System Admin', 'admin@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'admin', 'active');

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) 
VALUES (2, 'Test Teacher', 'teacher1@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'teacher', 'active');

INSERT OR IGNORE INTO teachers (id, user_id, employee_id, department)
VALUES (1, 2, 'T-1001', 'Computer Science');

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) 
VALUES (3, 'Test Student', 'student1@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'student', 'active');

INSERT OR IGNORE INTO students (id, user_id, registration_number, department)
VALUES (1, 3, 'S-2023-001', 'Computer Science');

