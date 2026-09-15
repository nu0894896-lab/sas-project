# Software Requirements Specification (SRS)

## Secure Attendance Management System

**Version:** 2.0
**Date:** 07 September 2026

---

# 1. Introduction

## 1.1 Project Name

**Secure Attendance Management System**

## 1.2 Purpose

The purpose of the Secure Attendance Management System is to provide a fast, automated, and secure method for managing student attendance in university classes.

The system is designed to reduce proxy attendance by using multiple verification layers. A student must have a valid account, use their registered mobile device, be within the required proximity range, and successfully complete biometric verification before attendance can be recorded.

The system will provide teachers with a live attendance status and allow students to view their attendance history.

## 1.3 Objectives

The main objectives of the system are:

* To automate classroom attendance.
* To reduce proxy attendance.
* To verify students using multiple security layers.
* To associate a student's account with an authorized mobile device.
* To verify that the registered device is within the required classroom proximity.
* To use supported device biometric authentication for identity verification.
* To provide teachers with live attendance information.
* To maintain accurate attendance records and reports.

---

# 2. Project Scope

The system will provide secure attendance management for university classes.

The core system will include the following modules:

### 2.1 User & Account Management

* Admin, Teacher, and Student accounts.
* Secure login and authentication.
* Role-based access.

### 2.2 Student Management

* Add, update, and manage student information.
* Associate students with their accounts.
* View student attendance records.

### 2.3 Teacher Management

* Manage teacher accounts.
* Associate teachers with assigned courses/classes.
* Allow teachers to conduct attendance sessions.

### 2.4 Course/Class Management

* Create and manage courses/classes.
* Assign teachers to courses.
* Associate students with relevant classes.

### 2.5 Device Registration

* Allow students to register an authorized mobile device.
* Associate the registered device with the student's account.
* Prevent attendance from unauthorized devices.

### 2.6 Attendance Session

* Teacher selects a class/course.
* Teacher starts an attendance session.
* Session remains active for a defined period.
* Students can participate only while the session is active.

### 2.7 Proximity Verification

* The system verifies that the registered student device is within the required proximity range.
* Device registration alone is not sufficient to mark attendance.

### 2.8 Biometric Verification

* The student's supported device biometric authentication will be used for identity verification.
* Raw fingerprint/biometric information will not be stored unnecessarily in the application database.

### 2.9 Attendance Recording

Attendance will be recorded only after the required verification steps are successfully completed.

### 2.10 Attendance Reports

* Teacher can view class attendance.
* Student can view personal attendance history.
* Attendance can be viewed by date and status.

---

# 3. Users / Actors

The system will have three main actors.

## 3.1 Admin

The Admin will:

* Log in securely.
* Manage student accounts.
* Manage teacher accounts.
* Manage courses/classes.
* Manage system records.
* View attendance records.

## 3.2 Teacher

The Teacher will:

* Log in securely.
* View assigned classes.
* Select a class.
* Start and end an attendance session.
* View student device detection/status.
* View live attendance status.
* View attendance reports.

## 3.3 Student

The Student will:

* Log in securely.
* Register an authorized mobile device.
* View enrolled classes.
* Participate in an active attendance session.
* Complete biometric verification.
* View personal attendance history.

---

# 4. Overall Attendance Workflow

The attendance process will follow these steps:

1. Teacher logs in.
2. Teacher selects the assigned class.
3. Teacher starts an attendance session.
4. System creates a temporary attendance session.
5. Registered student devices are detected within the required proximity.
6. Student's registered device is verified.
7. Student completes supported biometric verification.
8. System verifies the required conditions.
9. Attendance is recorded.
10. Teacher's live attendance status is updated.

### Verification Condition

**Valid Account + Registered Device + Required Proximity + Successful Biometric Verification = Attendance Allowed**

---

# 5. Functional Requirements

| ID    | Requirement                | Description                                                                                               |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| FR-01 | User Login                 | System shall allow Admin, Teacher, and Student to log in using their authorized accounts.                 |
| FR-02 | Role-Based Access          | System shall provide access according to the user's role.                                                 |
| FR-03 | Device Registration        | System shall allow a student to register an authorized mobile device.                                     |
| FR-04 | Device Verification        | System shall verify that the device used for attendance is the student's registered device.               |
| FR-05 | Attendance Session         | Teacher shall be able to start a temporary attendance session for an assigned class.                      |
| FR-06 | Session Expiration         | System shall prevent attendance after the attendance session has expired or ended.                        |
| FR-07 | Device Detection           | System shall detect eligible registered student devices within the required proximity range.              |
| FR-08 | Proximity Verification     | System shall verify that the registered device is within the required proximity.                          |
| FR-09 | Biometric Verification     | System shall require successful supported device biometric authentication before attendance is completed. |
| FR-10 | Attendance Recording       | System shall create an attendance record after successful verification.                                   |
| FR-11 | Duplicate Prevention       | System shall prevent a student from marking attendance more than once in the same session.                |
| FR-12 | Live Attendance Status     | Teacher shall be able to view live attendance status during an active session.                            |
| FR-13 | Student Attendance History | Student shall be able to view previous attendance records.                                                |
| FR-14 | Teacher Attendance Report  | Teacher shall be able to view attendance reports for assigned classes.                                    |
| FR-15 | Admin Management           | Admin shall be able to manage students, teachers, courses/classes, and relevant system records.           |

---

# 6. Attendance Status

The system will use the following statuses:

| Status               | Meaning                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| Not Detected         | Student's registered device has not been detected within the required range. |
| Device Detected      | Registered device has been detected.                                         |
| Verification Pending | Required verification has not yet been completed.                            |
| Verified             | Required identity verification has been successfully completed.              |
| Present              | Attendance has been successfully recorded.                                   |
| Failed               | Required verification was unsuccessful.                                      |
| Session Expired      | Attendance session is no longer active.                                      |

---

# 7. Non-Functional Requirements

## NFR-01 Security

The system shall prevent unauthorized users and unauthorized devices from marking attendance.

## NFR-02 Performance

The attendance verification process should complete within a reasonable time without unnecessary classroom delays.

## NFR-03 Reliability

Successfully verified attendance records shall be stored correctly in the database.

## NFR-04 Usability

The interface shall be simple and easy for Admins, Teachers, and Students to use.

## NFR-05 Responsiveness

The system interfaces should work on mobile, tablet, and desktop screens.

## NFR-06 Privacy

Biometric information shall not be unnecessarily stored as raw biometric data in the application database.

## NFR-07 Availability

The system should remain available during normal university attendance periods.

---

# 8. Security Model

The system will use multiple security layers.

### Layer 1 — Account Authentication

User must have a valid authorized account.

### Layer 2 — Registered Device

Student must use their authorized registered mobile device.

### Layer 3 — Proximity Verification

The registered device must be within the required classroom/teacher proximity.

### Layer 4 — Biometric Verification

The student must successfully authenticate using supported device biometric authentication.

### Final Verification

All required conditions must be satisfied before attendance is recorded.

---

# 9. Database Requirements

The database will contain the following major entities.

## 9.1 Users

* User ID
* Name
* Email
* Authentication data
* Role
* Account status

## 9.2 Students

* Student ID
* Registration Number
* User ID
* Class/Course information

## 9.3 Teachers

* Teacher ID
* User ID

## 9.4 Devices

* Device ID
* Student ID
* Device identification/reference information
* Registration status
* Registration date

## 9.5 Courses

* Course ID
* Course Name
* Teacher ID

## 9.6 Enrollments

* Enrollment ID
* Student ID
* Course ID

## 9.7 Attendance Sessions

* Session ID
* Course ID
* Teacher ID
* Start Time
* End Time
* Session Status

## 9.8 Attendance Records

* Attendance ID
* Student ID
* Session ID
* Date
* Time
* Status

The above entities will later be converted into the **ER Diagram and relational database tables**.

---

# 10. Error and Exception Handling

The system shall handle situations such as:

* Invalid login credentials.
* Unauthorized device.
* Device not detected.
* Student outside the required proximity.
* Biometric verification failure.
* Attendance already marked.
* Attendance session expired.
* Attendance session ended by teacher.
* Network/server communication failure.
* Invalid or incomplete attendance request.

The system should display an appropriate message to the user for each failure.

---

# 11. System Constraints

* Student must have a compatible mobile device.
* Device proximity verification depends on supported wireless/device technology.
* Biometric verification depends on the capabilities of the student's device.
* Network connectivity may be required for communication with the server.
* Student cannot mark attendance using an unauthorized device.
* The exact proximity technology and supported devices must be finalized during technical design.

---

# 12. Assumptions

* Every student has a valid university account.
* Students complete device registration before using attendance.
* Teachers have authorized accounts.
* Teachers are assigned to their respective courses/classes.
* Required wireless communication is available in the classroom.
* Students' devices support the required biometric authentication.
* The server/database is available during attendance sessions.

---

# 13. Future Enhancements

The following features are outside the current core scope but may be added later:

* Attendance analytics.
* Automatic attendance percentage calculation.
* Email/SMS notifications.
* Late attendance detection.
* PDF/Excel attendance export.
* Multiple-device policies.
* Advanced anti-proxy detection.
* Additional attendance verification methods.

---

# 14. Development Modules

The project will be developed using the following major modules:

1. Authentication & Authorization
2. Admin Management
3. Student Management
4. Teacher Management
5. Course/Class Management
6. Device Registration
7. Attendance Session
8. Proximity Verification
9. Biometric Verification
10. Attendance Recording
11. Attendance Reports
12. Database
13. Frontend
14. Backend APIs
15. Testing & Integration

---

# 15. Final System Concept

The teacher starts an attendance session for a selected class. The system identifies registered student devices within the required proximity. The student's registered device is verified, followed by supported biometric authentication. After successful verification, the system records the student's attendance and updates the teacher's live attendance status.

The overall development chain will be:

**SRS → System Design → Database/ERD → API Design → UI Design → Frontend → Backend → Integration → Testing → Final System**
