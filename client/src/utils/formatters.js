/**
 * Format currency in Indian Rupees with Indian numbering system (e.g. ₹1,500, ₹1,50,000)
 * @param {number|string} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Format date in DD/MM/YYYY format
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date and time in DD/MM/YYYY hh:mm A
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}/${month}/${year} ${time}`;
};
