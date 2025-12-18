import api from './api'

export const projectService = {
  getAll: (params = {}) => api.get('/api/projects', { params }),
  getById: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  archive: (id) => api.post(`/api/projects/${id}/archive`),
}

export const volunteerService = {
  getAll: (projectId, params = {}) => 
    api.get(`/api/projects/${projectId}/volunteers`, { params }),
  getById: (projectId, volunteerId) => 
    api.get(`/api/projects/${projectId}/volunteers/${volunteerId}`),
  getStats: (projectId) => 
    api.get(`/api/projects/${projectId}/volunteers/stats`),
  create: (projectId, data) => 
    api.post(`/api/projects/${projectId}/volunteers`, data),
  update: (projectId, volunteerId, data) => 
    api.put(`/api/projects/${projectId}/volunteers/${volunteerId}`, data),
  delete: (projectId, volunteerId, data = {}) => 
    api.delete(`/api/projects/${projectId}/volunteers/${volunteerId}`, { data }),
}

export const userService = {
  getAll: (params = {}) => api.get('/api/users', { params }),
  getById: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  resetPassword: (id, data) => api.post(`/api/users/${id}/reset-password`, data),
  deactivate: (id) => api.delete(`/api/users/${id}`),
}

export const auditService = {
  getAll: (params = {}) => api.get('/api/audit', { params }),
  getByProject: (projectId, params = {}) => 
    api.get(`/api/audit/project/${projectId}`, { params }),
  getById: (id) => api.get(`/api/audit/${id}`),
}

export const reportService = {
  exportCSV: (projectId, params = {}) => 
    api.get(`/api/reports/project/${projectId}/csv`, { 
      params,
      responseType: 'blob' 
    }),
  exportPDF: (projectId, params = {}) => 
    api.get(`/api/reports/project/${projectId}/pdf`, { 
      params,
      responseType: 'blob' 
    }),
}
