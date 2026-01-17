export function sanitizeHtml(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  
  if (typeof input !== 'string') {
    return null;
  }
  
  const sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

export function sanitizeString(input: string): string {
  return sanitizeHtml(input) ?? input;
}

export function sanitizeObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  const sanitized = { ...obj };
  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field] as string) as any;
    }
  }
  return sanitized;
}
