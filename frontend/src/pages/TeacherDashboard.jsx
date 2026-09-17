import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function TeacherDashboard({ user, setUser }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedDurations, setSelectedDurations] = useState({});
  const [studentFilter, setStudentFilter] = useState('all'); // 'all' | 'present' | 'unmarked'
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
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
            break;
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  // Poll live attendance status while session is active
  useEffect(() => {
    if (!activeSession?.id) {
      setLiveStatus(null);
      setTimeLeft(null);
      return;
    }

    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/sessions/${activeSession.id}/live-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLiveStatus(data);
          if (data.remaining_seconds !== null && data.remaining_seconds !== undefined) {
            setTimeLeft(data.remaining_seconds);
          }
          if (data.session?.status === 'ended' && activeSession.status === 'active') {
            setActiveSession(prev => ({ ...prev, status: 'ended' }));
          }
        }
      } catch (e) {
        console.error("Live status poll failed", e);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  // Local second-by-second countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startSession = async (courseId) => {
    const duration = selectedDurations[courseId] || 10;
    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          course_id: courseId,
          duration_minutes: duration
        })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data);
        setSubmissionResult(null);
      } else {
        const errData = await response.json();
        alert(`Failed to start session: ${errData.message}`);
      }
    } catch (error) {
      console.error("Failed to start session");
      alert('Network error while starting session');
    }
  };

  const endSessionEarly = async (sessionId) => {
    if (!window.confirm("End this session without auto-marking absentees? (To finalize the register, use 'Submit Attendance' instead)")) {
      return;
    }
    try {
      const response = await fetch(`/api/sessions/end/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setActiveSession(null);
        setLiveStatus(null);
        alert('Session ended.');
      } else {
        alert('Failed to end session');
      }
    } catch (error) {
      alert('Network error while ending session');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!activeSession?.id) return;
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissionResult(data);
        setActiveSession(null);
        setLiveStatus(null);
        setShowSubmitModal(false);
        fetchCourses();
      } else {
        const errData = await response.json();
        alert(`Failed to submit attendance: ${errData.message}`);
      }
    } catch (error) {
      alert('Network error while submitting attendance');
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

  // Filter students based on active tab
  const getFilteredStudents = () => {
    if (!liveStatus) return [];
    if (studentFilter === 'present') return liveStatus.present || [];
    if (studentFilter === 'unmarked') return liveStatus.unmarked || [];
    return [...(liveStatus.present || []), ...(liveStatus.unmarked || [])];
  };

  const filteredStudents = getFilteredStudents();
  const isExpiringSoon = timeLeft !== null && timeLeft <= 120 && timeLeft > 0;
  const isExpired = timeLeft === 0 || liveStatus?.is_expired;

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
        {/* Submission Success Banner */}
        {submissionResult && (
          <div className="glass-panel" style={{ 
            marginBottom: '2rem', 
            border: '2px solid #10b981', 
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '1.5rem 2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>✓</span> Attendance Submitted & Finalized Successfully!
                </h3>
                <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  Total Enrolled: <strong>{submissionResult.total_enrolled}</strong> &bull; 
                  Present: <strong style={{ color: '#10b981' }}>{submissionResult.present_count}</strong> &bull; 
                  Absent: <strong style={{ color: '#ef4444' }}>{submissionResult.absent_count}</strong>
                  {submissionResult.newly_marked_absent > 0 && ` (${submissionResult.newly_marked_absent} automatically recorded as Absent)`}
                </p>
              </div>
              <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: '#334155' }} onClick={() => setSubmissionResult(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activeTab === 'classes' ? (
          <>
            <h1 className="title">My Classes</h1>
            <p className="subtitle">Start a timed attendance session and monitor student check-ins live.</p>

            {/* LIVE ATTENDANCE SESSION PANEL */}
            {activeSession && (
              <div className="glass-panel" style={{ 
                marginBottom: '3rem', 
                border: isExpired ? '2px solid #ef4444' : isExpiringSoon ? '2px solid #f59e0b' : '2px solid var(--primary-accent)', 
                background: 'rgba(15, 23, 42, 0.85)',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6)'
              }}>
                {/* Header with Title and Expiry Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: isExpired ? '#ef4444' : '#10b981',
                        display: 'inline-block',
                        boxShadow: isExpired ? '0 0 10px #ef4444' : '0 0 10px #10b981'
                      }}></span>
                      <h2 className="title" style={{ fontSize: '1.6rem', margin: 0, color: 'var(--primary-accent)' }}>
                        Live Attendance Session {liveStatus?.session?.course_name ? `(${liveStatus.session.course_name})` : `(Course #${activeSession.course_id})`}
                      </h2>
                    </div>
                    <p className="subtitle" style={{ margin: 0 }}>
                      Students scan the QR code or enter this proximity token on their mobile app.
                    </p>
                  </div>

                  {/* Countdown Timer Widget */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    background: isExpired ? 'rgba(239, 68, 68, 0.15)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                    border: `1px solid ${isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : 'var(--primary-accent)'}`,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    minWidth: '160px'
                  }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      {isExpired ? 'Status' : 'Time Remaining'}
                    </span>
                    <span style={{ 
                      fontSize: '2rem', 
                      fontWeight: '800', 
                      fontFamily: 'monospace',
                      color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#38bdf8' 
                    }}>
                      {isExpired ? 'EXPIRED' : formatTime(timeLeft)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isExpired ? '#ef4444' : 'var(--text-muted)' }}>
                      {isExpired ? 'Session time limit reached' : 'Auto-closes on timeout'}
                    </span>
                  </div>
                </div>

                {/* Token and QR Code Row */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '2rem', 
                  alignItems: 'center', 
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                      Proximity Token
                    </label>
                    <div style={{ 
                      background: 'white', 
                      color: '#0f172a', 
                      padding: '1rem 1.5rem', 
                      borderRadius: '8px', 
                      display: 'inline-block',
                      fontSize: '2.2rem',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      letterSpacing: '0.15em',
                      border: '2px dashed #94a3b8'
                    }}>
                      {activeSession.proximity_token}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                      QR Code Scanner
                    </label>
                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                      <QRCodeSVG 
                        value={JSON.stringify({ c_id: activeSession.course_id, token: activeSession.proximity_token })} 
                        size={120} 
                        level="H"
                      />
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Attendance Progress:</span>
                      <strong style={{ color: '#10b981' }}>
                        {liveStatus ? `${liveStatus.present_count} / ${liveStatus.total_enrolled} (${liveStatus.total_enrolled > 0 ? Math.round((liveStatus.present_count / liveStatus.total_enrolled) * 100) : 0}%)` : 'Loading...'}
                      </strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${liveStatus && liveStatus.total_enrolled > 0 ? Math.round((liveStatus.present_count / liveStatus.total_enrolled) * 100) : 0}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                        transition: 'width 0.5s ease-in-out'
                      }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ 
                        background: 'rgba(16, 185, 129, 0.2)', 
                        color: '#34d399', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        ✓ Present: {liveStatus?.present_count ?? 0}
                      </span>
                      <span style={{ 
                        background: 'rgba(239, 68, 68, 0.2)', 
                        color: '#f87171', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        ⏳ Not Marked: {liveStatus?.unmarked_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LIVE STUDENT LIST SECTION */}
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Live Student Check-in Roster</h3>
                    
                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem', borderRadius: '8px' }}>
                      <button 
                        onClick={() => setStudentFilter('all')}
                        style={{
                          background: studentFilter === 'all' ? 'var(--primary-accent)' : 'transparent',
                          color: studentFilter === 'all' ? 'white' : 'var(--text-muted)',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        All ({liveStatus?.total_enrolled ?? 0})
                      </button>
                      <button 
                        onClick={() => setStudentFilter('present')}
                        style={{
                          background: studentFilter === 'present' ? '#10b981' : 'transparent',
                          color: studentFilter === 'present' ? 'white' : 'var(--text-muted)',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Present ({liveStatus?.present_count ?? 0})
                      </button>
                      <button 
                        onClick={() => setStudentFilter('unmarked')}
                        style={{
                          background: studentFilter === 'unmarked' ? '#ef4444' : 'transparent',
                          color: studentFilter === 'unmarked' ? 'white' : 'var(--text-muted)',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Not Marked ({liveStatus?.unmarked_count ?? 0})
                      </button>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div style={{ maxHeight: '280px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table className="glass-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Reg. Number</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Check-in Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((st, idx) => {
                          const isPresent = st.status === 'Present';
                          return (
                            <tr key={idx} style={{ background: isPresent ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                              <td style={{ fontWeight: isPresent ? '600' : 'normal' }}>
                                {st.name}
                              </td>
                              <td style={{ fontFamily: 'monospace' }}>{st.registration_number}</td>
                              <td>{st.department || 'N/A'}</td>
                              <td>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isPresent ? '#34d399' : '#f87171',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  <span>{isPresent ? '●' : '○'}</span>
                                  {isPresent ? 'Present' : 'Not Marked'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Waiting...'}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                              {liveStatus?.total_enrolled === 0 
                                ? 'No students enrolled in this course yet.' 
                                : studentFilter === 'present' 
                                  ? 'No students have checked in yet. Waiting for scans...' 
                                  : 'All enrolled students have marked their attendance! 🎉'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BOTTOM ACTION BAR: SUBMIT ATTENDANCE BUTTON */}
                <div style={{ 
                  marginTop: '2rem', 
                  paddingTop: '1.5rem', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Auto-refreshes every 3 seconds. When you are done taking attendance, click <strong>Submit Attendance</strong>.
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      className="btn" 
                      onClick={() => endSessionEarly(activeSession.id)}
                      style={{ 
                        background: 'transparent', 
                        border: '1px solid #64748b', 
                        color: '#94a3b8', 
                        width: 'auto', 
                        padding: '0.75rem 1.25rem' 
                      }}
                    >
                      Cancel Session
                    </button>

                    <button 
                      className="btn" 
                      onClick={() => setShowSubmitModal(true)}
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: 'white', 
                        fontWeight: '700',
                        fontSize: '1rem',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                        width: 'auto', 
                        padding: '0.75rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>✓</span> Submit Attendance
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRMATION MODAL FOR SUBMIT ATTENDANCE */}
            {showSubmitModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}>
                <div className="glass-panel" style={{ 
                  maxWidth: '500px', 
                  width: '90%', 
                  background: '#1e293b', 
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                }}>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
                    Finalize & Submit Attendance?
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    This will permanently close the session and finalize the class register:
                  </p>

                  <div style={{ 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Present Students:</span>
                      <strong style={{ color: '#10b981' }}>{liveStatus?.present_count ?? 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Absent Students (auto-marked):</span>
                      <strong style={{ color: '#ef4444' }}>{liveStatus?.unmarked_count ?? 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Enrolled:</span>
                      <strong>{liveStatus?.total_enrolled ?? 0}</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1.5rem' }}>
                    ⚠️ Once submitted, no more students will be able to scan or check in for this session.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button 
                      className="btn" 
                      style={{ width: 'auto', background: '#334155' }} 
                      onClick={() => setShowSubmitModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn" 
                      style={{ width: 'auto', background: '#10b981', fontWeight: 'bold' }} 
                      onClick={handleSubmitAttendance}
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CLASS CARDS GRID */}
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {courses.map(course => {
                const duration = selectedDurations[course.id] || 10;
                return (
                  <div key={course.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {course.course_code}
                        </span>
                        <h3 style={{ margin: '0.2rem 0' }}>{course.course_name}</h3>
                      </div>
                    </div>

                    {/* Session Duration Selector */}
                    <div style={{ 
                      marginBottom: '1rem', 
                      background: 'rgba(15, 23, 42, 0.4)', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        ⏱ Session Duration:
                      </label>
                      <select 
                        className="input" 
                        value={duration} 
                        onChange={(e) => setSelectedDurations({ ...selectedDurations, [course.id]: Number(e.target.value) })}
                        disabled={activeSession !== null}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      >
                        <option value={5}>5 Minutes (Quick Check-in)</option>
                        <option value={10}>10 Minutes (Standard)</option>
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes</option>
                        <option value={60}>60 Minutes (Full Lecture)</option>
                      </select>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button 
                        className="btn" 
                        onClick={() => startSession(course.id)}
                        disabled={activeSession !== null}
                        style={{
                          background: activeSession !== null ? '#334155' : 'var(--primary-accent)',
                          fontWeight: '600'
                        }}
                      >
                        {activeSession?.course_id === course.id ? 'Session Running Above ↑' : `Start Session (${duration}m)`}
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn" 
                          style={{ background: '#10b981', flex: '1', fontSize: '0.85rem' }}
                          onClick={() => handleExportCSV(course.id)}
                        >
                          Export CSV
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ flex: '1', fontSize: '0.85rem' }}
                          onClick={() => handleSendWarnings(course.id)}
                        >
                          Warnings (&lt;75%)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
