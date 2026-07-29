import { cookies } from 'next/headers';

export async function getUserKey() {
  const cookieStore = await cookies();
  const personaId = cookieStore.get('personaId')?.value;
  if (personaId) {
    return `persona:${personaId}`;
  }
  
  const sessionId = cookieStore.get('sessionId')?.value;
  if (sessionId) {
    return `anon:${sessionId}`;
  }
  
  throw new Error('No session ID found');
}

export async function getRawSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get('sessionId')?.value;
}
