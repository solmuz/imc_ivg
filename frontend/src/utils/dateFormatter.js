/**
 * Date formatting utilities for consistent DD/MM/YYYY format throughout the application
 */

/**
 * Format a date to DD/MM/YYYY format
 * @param {string | Date} dateValue - Date string or Date object
 * @returns {string} Formatted date as DD/MM/YYYY
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  const date = new Date(dateValue)
  
  if (isNaN(date.getTime())) return 'Fecha inválida'
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Format a date to DD/MM/YYYY HH:MM:SS format
 * @param {string | Date} dateValue - Date string or Date object
 * @returns {string} Formatted datetime as DD/MM/YYYY HH:MM:SS
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  const date = new Date(dateValue)
  
  if (isNaN(date.getTime())) return 'Fecha y hora inválida'
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Format a date to DD/MM/YYYY HH:MM format (without seconds)
 * @param {string | Date} dateValue - Date string or Date object
 * @returns {string} Formatted datetime as DD/MM/YYYY HH:MM
 */
export const formatDateTimeShort = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  const date = new Date(dateValue)
  
  if (isNaN(date.getTime())) return 'Fecha y hora inválida'
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default {
  formatDate,
  formatDateTime,
  formatDateTimeShort
}
