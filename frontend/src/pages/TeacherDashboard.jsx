import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function TeacherDashboard({ user, setUser }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [activeTab, setActiveTab] = useState('classes');
  const [selectedReportCourse, setSelectedReportCourse] = useState('');
  const [reportData, setReportData] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('sas_token');

  useEffect(() => {
    fetchCourses();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // auth/me now needs to return teacher_id, but it doesn't yet.
        // Wait, I will just update backend authController.js to return it.
        if (data.teacher_id) setTeacherId(data.teacher_id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses/my-courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
        
        // Fetch active session if one exists
        for (let course of data) {
          const res = await fetch(`/api/sessions/active/${course.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const sessionData = await res.json();
            setActiveSession(sessionData);
            break; // Only allow one active session shown at a time
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  const startSession = async (courseId) => {
    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ course_id: courseId })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data);
        alert('Session started successfully!');
      } else {
        const errData = await response.json();
        alert(`Failed to start session: ${errData.message}`);
      }
    } catch (error) {
      console.error("Failed to start session");
      alert('Network error while starting session');
    }
  };

  const endSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/end/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setActiveSession(null);
        alert('Session ended successfully!');
      } else {
        alert('Failed to end session');
      }
    } catch (error) {
      alert('Network error while ending session');
    }
  };

  const handleExportCSV = async (courseId) => {
    try {
      const response = await fetch(`/api/reports/course/${courseId}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_course_${courseId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed");
    }
  };

  const handleSendWarnings = async (courseId) => {
    try {
      const response = await fetch(`/api/notifications/warn/${courseId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error("Warning trigger failed");
    }
  };

  const fetchReport = async (courseId) => {
    setSelectedReportCourse(courseId);
    if (!courseId) {
      setReportData([]);
      return;
    }
    try {
      const response = await fetch(`/api/reports/course/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Failed to fetch report");
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
        <h2 className="title" style={{ fontSize: '1.5rem' }}>SAS Teacher</h2>
        <div className="sidebar-nav">
          <a href="#" className={`sidebar-link ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>My Classes</a>
          <a href="#" className={`sidebar-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); fetchReport(selectedReportCourse || courses[0]?.id || ''); }}>Reports</a>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Logged in as {user.name}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 'bold' }}>Teacher ID: {teacherId || 'Loading...'}</p>
          <button onClick={handleLogout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'classes' ? (
          <>
            <h1 className="title">My Classes</h1>
            <p className="subtitle">Select a class to start a live attendance session.</p>

            {activeSession && (
              <div className="glass-panel" style={{ marginBottom: '3rem', border: '2px solid var(--primary-accent)', background: 'rgba(59, 130, 246, 0.05)' }}>
                <h2 className="title" style={{ fontSize: '1.5rem', color: 'var(--primary-accent)' }}>Active Session (Course ID: {activeSession.course_id})</h2>
                <p className="subtitle">Ask students to scan or enter this proximity token on their mobile app.</p>
                
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '1rem' }}>
                  <div style={{ 
                    background: 'white', 
                    color: 'black', 
                    padding: '1.5rem 2rem', 
                    borderRadius: '8px', 
                    display: 'inline-block',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em',
                    border: '2px dashed #cbd5e1'
                  }}>
                    {activeSession.proximity_token}
                  </div>
                  
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <QRCodeSVG 
                      value={JSON.stringify({ c_id: activeSession.course_id, token: activeSession.proximity_token })} 
                      size={150} 
                      level="H"
                    />
                  </div>
                </div>
                
                <div style={{ marginTop: '2rem' }}>
                  <button className="btn btn-danger" onClick={() => endSession(activeSession.id)} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                    End Session
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {courses.map(course => (
                <div key={course.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{course.course_name}</h3>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button 
                      className="btn" 
                      onClick={() => startSession(course.id)}
                      disabled={activeSession !== null}
                    >
                      Start Session
                    </button>
                    <button 
                      className="btn" 
                      style={{ background: '#10b981' }}
                      onClick={() => handleExportCSV(course.id)}
                    >
                      Export CSV
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleSendWarnings(course.id)}
                    >
                      Send Warnings (&lt;75%)
                    </button>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="glass-panel">
                  <p style={{ color: 'var(--text-muted)' }}>You have no assigned courses.</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'reports' ? (
          <>
            <h1 className="title">Attendance Reports</h1>
            <p className="subtitle">View detailed attendance statistics for your courses.</p>
            
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select 
                  className="input" 
                  value={selectedReportCourse} 
                  onChange={(e) => fetchReport(e.target.value)}
                  style={{ maxWidth: '300px' }}
                >
                  <option value="" disabled>Select a Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_name}</option>
                  ))}
                </select>
                
                {selectedReportCourse && (
                  <button 
                    className="btn" 
                    style={{ background: '#10b981', width: 'auto' }}
                    onClick={() => handleExportCSV(selectedReportCourse)}
                  >
                    Download CSV
                  </button>
                )}
              </div>
            </div>

            {selectedReportCourse && (
              <div className="glass-panel">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Registration No.</th>
                      <th>Classes Attended</th>
                      <th>Total Classes</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, i) => {
                      const percent = row.total_sessions > 0 ? Math.round((row.total_present / row.total_sessions) * 100) : 0;
                      return (
                        <tr key={i}>
                          <td>{row.student_name}</td>
                          <td>{row.registration_number}</td>
                          <td>{row.total_present}</td>
                          <td>{row.total_sessions}</td>
                          <td>
                            <span className={`badge ${percent >= 75 ? 'badge-active' : 'badge-danger'}`} style={{ color: percent >= 75 ? '#065f46' : '#991b1b' }}>
                              {percent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {reportData.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No students enrolled in this course yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
