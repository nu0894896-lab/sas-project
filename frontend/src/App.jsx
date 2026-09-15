import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // In a real app, this would check localStorage or an auth context
    const storedUser = localStorage.getItem('sas_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          
          <Route path="/admin" element={
            user && user.role === 'admin' ? 
            <AdminDashboard user={user} setUser={setUser} /> : 
            <Navigate to="/login" />
          } />
          
          <Route path="/teacher" element={
            user && user.role === 'teacher' ? 
            <TeacherDashboard user={user} setUser={setUser} /> : 
            <Navigate to="/login" />
          } />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
