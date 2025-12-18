import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Users from './pages/Users'
import AuditTrail from './pages/AuditTrail'
import ChangePassword from './pages/ChangePassword'

function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading">Cargando...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" />
  }
  
  return children
}

function App() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        <Route path="users" element={
          <PrivateRoute allowedRoles={['Administrador']}>
            <Users />
          </PrivateRoute>
        } />
        <Route path="audit" element={
          <PrivateRoute allowedRoles={['Administrador', 'Calidad']}>
            <AuditTrail />
          </PrivateRoute>
        } />
        <Route path="change-password" element={<ChangePassword />} />
      </Route>
    </Routes>
  )
}

export default App
