import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

function Layout() {
  const { user, logout, canViewAudit, canManageUsers } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <h1>IMC Management</h1>
        </div>
        <nav className="header-nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/projects">Proyectos</NavLink>
          {canManageUsers() && <NavLink to="/users">Usuarios</NavLink>}
          {canViewAudit() && <NavLink to="/audit">Auditoría</NavLink>}
        </nav>
        <div className="header-user">
          <span className="user-info">
            {user?.nombre} <span className="user-role">({user?.rol})</span>
          </span>
          <NavLink to="/change-password" className="btn-link">Cambiar contraseña</NavLink>
          <button onClick={handleLogout} className="btn-logout">Cerrar sesión</button>
        </div>
      </header>
      
      <main className="main-content">
        <Outlet />
      </main>
      
      <footer className="footer">
        <p>© 2024 IMC Management System - v1.0.0</p>
      </footer>
    </div>
  )
}

export default Layout
