import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [newCourse, setNewCourse] = useState({ course_code: '', course_name: '', teacher_id: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', registration_number: '', department: '' });
  const [enrollment, setEnrollment] = useState({ student_id: '', course_id: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchTeachers();
    fetchStudents();
    fetchDevices();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/admin/teachers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeachers(data);
        if (data.length > 0) {
          setNewCourse(prev => ({ ...prev, teacher_id: data[0].teacher_id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch teachers");
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/admin/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
        if (data.length > 0) {
          setEnrollment(prev => ({ ...prev, student_id: data[0].student_id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch students");
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/admin/devices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      }
    } catch (error) {
      console.error("Failed to fetch devices");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses/my-courses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sas_token')}`
        },
        body: JSON.stringify(newCourse)
      });
      if (response.ok) {
        setNewCourse({ course_code: '', course_name: '', teacher_id: teachers[0]?.teacher_id || '' });
        fetchCourses();
        alert("Course created successfully!");
      } else {
        alert("Failed to create course. Make sure teacher ID exists and course code is unique.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sas_token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (response.ok) {
        setNewUser({ name: '', email: '', password: '', role: 'student', registration_number: '', department: '' });
        fetchUsers();
        if (newUser.role === 'student') fetchStudents();
        if (newUser.role === 'teacher') fetchTeachers();
        alert("User created successfully!");
      } else {
        const errData = await response.json();
        alert(`Failed to create user: ${errData.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sas_token')}`
        },
        body: JSON.stringify(enrollment)
      });
      if (response.ok) {
        alert("Student enrolled successfully!");
      } else {
        const errData = await response.json();
        alert(`Failed to enroll student: ${errData.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm("Are you sure you want to revoke this device? The student will be forced to register their new device.")) return;
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sas_token')}` }
      });
      if (response.ok) {
        alert("Device revoked.");
        fetchDevices();
      } else {
        alert("Failed to revoke device.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sas_user');
    localStorage.removeItem('sas_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <>
      <div className="sidebar glass-panel" style={{ border: 'none', borderRadius: '0' }}>
        <h2 className="title" style={{ fontSize: '1.5rem' }}>SAS Admin</h2>
        <div className="sidebar-nav">
          <a href="#" className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>User Management</a>
          <a href="#" className={`sidebar-link ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>Courses</a>
          <a href="#" className={`sidebar-link ${activeTab === 'enrollments' ? 'active' : ''}`} onClick={() => {
            setActiveTab('enrollments');
            if (courses.length > 0 && !enrollment.course_id) {
              setEnrollment(prev => ({ ...prev, course_id: courses[0].id }));
            }
          }}>Enrollments</a>
          <a href="#" className={`sidebar-link ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}>Devices</a>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Logged in as {user.name}</p>
          <button onClick={handleLogout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'users' ? (
          <>
            <h1 className="title">User Management</h1>
            <p className="subtitle">Manage system access for teachers and students.</p>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New User</h3>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Full Name" className="input" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input type="email" placeholder="Email" className="input" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                <input type="password" placeholder="Password" className="input" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                
                <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>

                {newUser.role === 'student' && (
                  <input type="text" placeholder="Registration No." className="input" required value={newUser.registration_number} onChange={e => setNewUser({...newUser, registration_number: e.target.value})} />
                )}
                {newUser.role === 'teacher' && (
                  <input type="text" placeholder="Department (Optional)" className="input" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
                )}

                <button type="submit" className="btn" style={{ background: '#10b981' }}>Create User</button>
              </form>
            </div>

            <div className="glass-panel">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-active' : ''}`}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'courses' ? (
          <>
            <h1 className="title">Courses</h1>
            <p className="subtitle">View and manage registered courses.</p>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Course</h3>
              <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Course Code" 
                  className="input" 
                  required
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({...newCourse, course_code: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Course Name" 
                  className="input" 
                  required
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({...newCourse, course_name: e.target.value})}
                />
                <select 
                  className="input"
                  required 
                  value={newCourse.teacher_id}
                  onChange={(e) => setNewCourse({...newCourse, teacher_id: e.target.value})}
                >
                  {teachers.map(t => (
                    <option key={t.teacher_id} value={t.teacher_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn" style={{ background: '#10b981' }}>Add Course</button>
              </form>
            </div>

            <div className="glass-panel">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.course_code || 'N/A'}</td>
                      <td>{c.course_name}</td>
                      <td>{c.teacher_name || `Teacher ID: ${c.teacher_id}`}</td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No courses have been created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'enrollments' ? (
          <>
            <h1 className="title">Enrollments</h1>
            <p className="subtitle">Enroll students into registered courses.</p>

            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Enroll a Student</h3>
              <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <select 
                  className="input"
                  required 
                  value={enrollment.student_id}
                  onChange={(e) => setEnrollment({...enrollment, student_id: e.target.value})}
                >
                  <option value="" disabled>Select Student</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name} ({s.registration_number})
                    </option>
                  ))}
                </select>
                
                <select 
                  className="input"
                  required 
                  value={enrollment.course_id}
                  onChange={(e) => setEnrollment({...enrollment, course_id: e.target.value})}
                >
                  <option value="" disabled>Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.course_name}
                    </option>
                  ))}
                </select>
                
                <button type="submit" className="btn" style={{ background: '#10b981' }}>Enroll Student</button>
              </form>
            </div>
          </>
        ) : activeTab === 'devices' ? (
          <>
            <h1 className="title">Device Management</h1>
            <p className="subtitle">View and revoke registered student devices to prevent proxy attendance.</p>
            
            <div className="glass-panel">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Registration No.</th>
                    <th>Device Model</th>
                    <th>Device ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id}>
                      <td>{d.student_name}</td>
                      <td>{d.registration_number}</td>
                      <td>{d.device_model || 'Unknown'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{d.device_identifier}</td>
                      <td>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                          onClick={() => handleRevokeDevice(d.id)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No devices have been registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
