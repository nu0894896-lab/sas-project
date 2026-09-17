import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StudentDashboard({ user, setUser }) {
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [device, setDevice] = useState(null);
  const [activeTab, setActiveTab] = useState('checkin');
  
  // Check-in states
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scannerRef = useRef(null);
  const navigate = useNavigate();

  // Ensure persistent unique client identifier
  const getClientDeviceId = () => {
    let devId = localStorage.getItem('sas_device_id');
    if (!devId) {
      devId = 'web_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem('sas_device_id', devId);
    }
    return devId;
  };

  useEffect(() => {
    fetchProfile();
    fetchCourses();
    fetchHistory();
    fetchDevice();
  }, []);

  // Poll courses every 5 seconds to detect newly opened teacher sessions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCourses(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAuthToken = () => localStorage.getItem('sas_token');

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/students/me', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  };

  const fetchCourses = async (silent = false) => {
    try {
      const res = await fetch('/api/courses/my-courses', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (!selectedCourseId && data.length > 0) {
          // Auto-select course that has an active session
          const active = data.find(c => c.is_active);
          setSelectedCourseId(active ? active.id : data[0].id);
        }
      }
    } catch (e) {
      if (!silent) console.error('Failed to load courses', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/reports/my-attendance', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load attendance history', e);
    }
  };

  const fetchDevice = async () => {
    try {
      const res = await fetch('/api/devices/my-device', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
      }
    } catch (e) {
      console.error('Failed to load device info', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sas_token');
    localStorage.removeItem('sas_user');
    setUser(null);
    navigate('/login');
  };

  // Perform attendance submission
  const submitAttendance = async (tokenValue, courseIdOverride = null) => {
    if (!tokenValue) {
      setCheckInStatus({ type: 'error', message: 'Please enter or scan a valid attendance code.' });
      return;
    }

    const courseId = courseIdOverride || selectedCourseId;
    setIsSubmitting(true);
    setCheckInStatus(null);

    try {
      // 1. Fetch the active session for the chosen course
      let activeSessionId = null;
      let proximityToken = tokenValue;

      // Check if tokenValue is JSON payload from QR: { c_id: 1, token: "XYZ" }
      try {
        const parsed = JSON.parse(tokenValue);
        if (parsed?.token) {
          proximityToken = parsed.token;
        }
      } catch (err) {}

      // Get active session ID for this course
      const sessionRes = await fetch(`/api/sessions/active/${courseId}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      if (!sessionRes.ok) {
        setCheckInStatus({ 
          type: 'error', 
          message: 'No active attendance session found for the selected course. Make sure your teacher has started the session.' 
        });
        setIsSubmitting(false);
        return;
      }

      const sessionData = await sessionRes.json();
      activeSessionId = sessionData.id;

      // 2. Submit attendance mark
      const deviceId = getClientDeviceId();
      const markRes = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          session_id: activeSessionId,
          device_identifier: deviceId,
          proximity_token: proximityToken,
          biometric_passed: true
        })
      });

      const markData = await markRes.json();

      if (markRes.ok) {
        setCheckInStatus({ 
          type: 'success', 
          message: `Attendance marked successfully as Present! (Session #${activeSessionId})` 
        });
        setTokenInput('');
        setIsScanning(false);
        fetchHistory();
        fetchDevice();
      } else {
        setCheckInStatus({ 
          type: 'error', 
          message: markData.message || 'Failed to mark attendance. Please check the code and try again.' 
        });
      }
    } catch (err) {
      console.error('Check-in error', err);
      setCheckInStatus({ type: 'error', message: 'Network error communicating with the server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Camera QR Scanner Toggle
  useEffect(() => {
    let scanner = null;
    if (isScanning) {
      try {
        scanner = new Html5QrcodeScanner('qr-reader-container', {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        });

        scanner.render(
          (decodedText) => {
            scanner.clear();
            setIsScanning(false);
            submitAttendance(decodedText);
          },
          (errorMessage) => {
            // Non-critical scan failure per frame
          }
        );
        scannerRef.current = scanner;
      } catch (e) {
        console.error('Scanner init error', e);
      }
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, [isScanning, selectedCourseId]);

  // Attendance stats
  const totalRecords = history.length;
  const presentCount = history.filter(h => h.status === 'Present').length;
  const absentCount = history.filter(h => h.status === 'Absent').length;
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  const activeCourses = courses.filter(c => c.is_active);

  return (
    <>
      <div className="sidebar glass-panel" style={{ border: 'none', borderRadius: '0' }}>
        <h2 className="title" style={{ fontSize: '1.5rem' }}>SAS Student</h2>
        <div className="sidebar-nav">
          <a href="#" className={`sidebar-link ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>
            Mark Attendance
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            My Courses ({courses.length})
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            History & Records
          </a>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Logged in as</p>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 'bold' }}>{user.name}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Reg: {profile?.registration_number || 'Loading...'}
          </p>
          <button onClick={handleLogout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      <div className="main-content">
        {/* Active Class Live Banner */}
        {activeCourses.length > 0 && (
          <div className="glass-panel" style={{ 
            marginBottom: '2rem', 
            border: '2px solid #3b82f6', 
            background: 'rgba(59, 130, 246, 0.12)',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span style={{ 
                display: 'inline-block', 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: '#10b981', 
                boxShadow: '0 0 10px #10b981',
                marginRight: '0.5rem' 
              }}></span>
              <strong style={{ color: '#60a5fa', fontSize: '1.1rem' }}>
                Active Attendance Session Open!
              </strong>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                Course: <strong>{activeCourses[0].course_code} - {activeCourses[0].course_name}</strong> &bull; Teacher: {activeCourses[0].teacher_name || 'Assigned'}
              </p>
            </div>
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '0.6rem 1.5rem', background: '#3b82f6' }}
              onClick={() => {
                setSelectedCourseId(activeCourses[0].id);
                setActiveTab('checkin');
              }}
            >
              Check-In Now →
            </button>
          </div>
        )}

        {/* Tab 1: Check-in Portal */}
        {activeTab === 'checkin' && (
          <>
            <h1 className="title">Attendance Check-In</h1>
            <p className="subtitle">Verify your presence using your web camera or the teacher's session code.</p>

            {/* Check-In Status Messages */}
            {checkInStatus && (
              <div className="glass-panel" style={{ 
                marginBottom: '1.5rem', 
                border: checkInStatus.type === 'success' ? '2px solid #10b981' : '2px solid #ef4444',
                background: checkInStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                padding: '1rem 1.5rem'
              }}>
                <h4 style={{ 
                  color: checkInStatus.type === 'success' ? '#10b981' : '#f87171', 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>{checkInStatus.type === 'success' ? '✓' : '⚠️'}</span> {checkInStatus.message}
                </h4>
              </div>
            )}

            {/* Attendance Verification Box */}
            <div className="glass-panel" style={{ maxWidth: '680px', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>1. Select Your Course</h3>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <select 
                  className="input" 
                  value={selectedCourseId} 
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{ fontSize: '1rem', padding: '0.75rem' }}
                >
                  {courses.length === 0 ? (
                    <option value="">No enrolled courses found</option>
                  ) : (
                    courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.course_name} {c.is_active ? '🟢 (Session Active)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <h3 style={{ marginBottom: '1.25rem' }}>2. Choose Verification Method</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Method A: Camera Scanner */}
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    background: isScanning ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                    padding: '1rem',
                    fontSize: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => setIsScanning(!isScanning)}
                >
                  <span style={{ fontSize: '1.5rem' }}>📷</span>
                  <span>{isScanning ? 'Close Camera' : 'Scan Teacher QR Code'}</span>
                </button>

                {/* Method B: Direct Code Input */}
                <div style={{ 
                  background: 'rgba(30, 41, 59, 0.6)', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                    Or enter 6-character Code:
                  </span>
                  <form onSubmit={(e) => { e.preventDefault(); submitAttendance(tokenInput); }} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="e.g. ABC123" 
                      className="input" 
                      value={tokenInput} 
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.1em' }}
                    />
                    <button 
                      type="submit" 
                      className="btn" 
                      disabled={isSubmitting || !tokenInput.trim()}
                      style={{ width: 'auto', background: '#10b981', padding: '0 1.25rem' }}
                    >
                      {isSubmitting ? '...' : 'Verify'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Web Camera Viewport */}
              {isScanning && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: 'rgba(0, 0, 0, 0.5)', 
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Point your camera at the QR code displayed on the teacher's screen.
                  </p>
                  <div id="qr-reader-container" style={{ maxWidth: '400px', margin: '0 auto' }}></div>
                </div>
              )}

              {/* Anti-Proxy Security Info */}
              <div style={{ 
                marginTop: '1.5rem', 
                borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                paddingTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <span>🔒 Anti-Proxy Security: Browser client bound to your student account</span>
                <span style={{ color: '#10b981' }}>Device: {device ? 'Verified & Active' : 'Auto-binding on check-in'}</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Attendance Rate</p>
                <h2 style={{ fontSize: '2.5rem', color: attendanceRate >= 75 ? '#10b981' : '#f59e0b', margin: '0.5rem 0' }}>
                  {attendanceRate}%
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {attendanceRate >= 75 ? 'Good Standing' : 'Needs Improvement'}
                </span>
              </div>

              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Sessions</p>
                <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{totalRecords}</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recorded to date</span>
              </div>

              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Classes Attended</p>
                <h2 style={{ fontSize: '2.5rem', color: '#10b981', margin: '0.5rem 0' }}>{presentCount}</h2>
                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{absentCount} Absent</span>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Enrolled Courses */}
        {activeTab === 'courses' && (
          <>
            <h1 className="title">My Enrolled Courses</h1>
            <p className="subtitle">Classes you are officially registered for in the Secure Attendance System.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {courses.map(c => (
                <div key={c.id} className="glass-panel" style={{ position: 'relative' }}>
                  {c.is_active && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '1rem', 
                      right: '1rem', 
                      background: 'rgba(16, 185, 129, 0.2)', 
                      color: '#10b981', 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '999px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      🟢 Live Session
                    </span>
                  )}
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--primary-accent)' }}>{c.course_code}</h3>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{c.course_name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                    Instructor: <strong>{c.teacher_name || 'Assigned Professor'}</strong>
                  </p>
                  <button 
                    className="btn" 
                    style={{ background: c.is_active ? '#3b82f6' : '#334155' }}
                    onClick={() => {
                      setSelectedCourseId(c.id);
                      setActiveTab('checkin');
                    }}
                  >
                    {c.is_active ? 'Go to Live Check-In →' : 'Select for Check-In'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab 3: Attendance History & Records */}
        {activeTab === 'history' && (
          <>
            <h1 className="title">Attendance History</h1>
            <p className="subtitle">Complete chronological verification history for all enrolled courses.</p>

            <div className="glass-panel">
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No attendance records found yet.</p>
                  <p style={{ fontSize: '0.9rem' }}>Check in to your first live class session to view records here.</p>
                </div>
              ) : (
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Session Date & Time</th>
                      <th>Marked At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record, idx) => (
                      <tr key={idx}>
                        <td><strong>{record.course_name}</strong></td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {new Date(record.start_time).toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : 'End of session'}
                        </td>
                        <td>
                          <span className={`badge ${record.status === 'Present' ? 'badge-active' : ''}`} style={{
                            background: record.status === 'Present' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: record.status === 'Present' ? '#34d399' : '#f87171'
                          }}>
                            {record.status === 'Present' ? '✓ Present' : '✗ Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
