# Development Index (Project Roadmap)

**Project:** Secure Attendance Management System
**Version:** 1.0

This roadmap outlines the phases of development to deliver the complete system as per the SRS.

## Phase 1: Foundation & Infrastructure (M00, M12)
- **M00_Foundation:** Setup Docker, mono-repo/multi-repo structure (backend, frontend, mobile), environment variables, and basic CI/CD or linting.
- **M12_Database:** Setup PostgreSQL database, define ERD, write initial migrations and seed data.

## Phase 2: Core User & Account Services (M01, M02, M14)
- **M01_Authentication_Authorization:** Implement JWT-based login, role-based access control (RBAC).
- **M02_Admin_Management:** API endpoints and UI for Admin to manage system users.
- **M14_Backend_APIs:** Establish core REST/GraphQL endpoints for the above.

## Phase 3: Academic Management (M03, M04, M05)
- **M03_Student_Management:** CRUD operations for students.
- **M04_Teacher_Management:** CRUD operations for teachers.
- **M05_Course_Class_Management:** Course creation, assigning teachers, and enrolling students.

## Phase 4: Device & Proximity Infrastructure (M06, M08, M09)
- **M06_Device_Registration:** Mobile app flow to register device UUID/token against student account.
- **M08_Proximity_Verification:** Implement logic to ensure registered device is near the teacher (e.g., using Bluetooth/BLE, Geolocation, or dynamic QR + time-sync).
- **M09_Biometric_Verification:** Integrate local mobile biometric prompt (FaceID/TouchID) before confirming presence.

## Phase 5: Attendance Execution (M07, M10, M11)
- **M07_Attendance_Session:** Teacher interface to start/stop a live attendance session.
- **M10_Attendance_Recording:** Secure backend endpoint accepting verified presence claims and recording them.
- **M11_Attendance_Reports:** Data aggregation and UI views for teachers (class view) and students (personal view).

## Phase 6: Frontend Integration & Polish (M13)
- **M13_Frontend:** Finalize web UI for Admin and Teacher dashboards. Polish mobile UI for students.

## Phase 7: Testing & Finalization (M15)
- **M15_Testing_Integration:** E2E testing across mobile app and web, security testing (anti-proxy), deployment to staging.
