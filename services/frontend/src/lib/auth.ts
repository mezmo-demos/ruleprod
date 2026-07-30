import { cookies } from 'next/headers';
import { anonKey, findPersona, personaKey, type Persona } from '@ruleprod/contracts';

/** Cookie holding the chosen persona id. Absent means browsing as a guest. */
export const PERSONA_COOKIE = 'personaId';

/**
 * The signed-in persona, or undefined for a guest. The cookie is untrusted
 * input, so an id that isn't in the roster reads as signed out rather than
 * producing a userKey nothing will ever match.
 */
export async function getPersona(): Promise<Persona | undefined> {
  const cookieStore = await cookies();
  return findPersona(cookieStore.get(PERSONA_COOKIE)?.value);
}

export async function getUserKey() {
  const persona = await getPersona();
  if (persona) {
    return personaKey(persona.id);
  }

  const sessionId = await getRawSessionId();
  if (sessionId) {
    return anonKey(sessionId);
  }

  throw new Error('No session ID found');
}

export async function getRawSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get('sessionId')?.value;
}
