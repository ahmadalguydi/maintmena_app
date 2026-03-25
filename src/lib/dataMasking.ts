/**
 * Data masking utilities for protecting sensitive information
 */

export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone: string): string => {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 7) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
};

export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber) return cardNumber;
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length < 8) return cardNumber;
  return `**** **** **** ${cleaned.slice(-4)}`;
};

export const maskName = (name: string): string => {
  if (!name) return name;
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return name.charAt(0) + '***';
  }
  return parts.map((part, index) => 
    index === 0 ? part : part.charAt(0) + '***'
  ).join(' ');
};
