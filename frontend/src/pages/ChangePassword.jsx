import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './ChangePassword.css'

function ChangePassword() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (formData.new_password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (formData.new_password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    
    try {
      await api.post('/api/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password
      })
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar contraseña')
    }
  }

  return (
    <div className="change-password-page">
      <div className="password-card">
        <h2>Cambiar Contraseña</h2>
        
        {user?.force_password_change && (
          <div className="warning-message">
            Debe cambiar su contraseña para continuar
          </div>
        )}
        
        {success ? (
          <div className="success-message">
            ✓ Contraseña actualizada exitosamente. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Contraseña actual</label>
              <input
                type="password"
                value={formData.current_password}
                onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                minLength={8}
                required
              />
              <small>Mínimo 8 caracteres</small>
            </div>
            
            <div className="form-group">
              <label>Confirmar nueva contraseña</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                required
              />
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Cambiar contraseña
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ChangePassword
