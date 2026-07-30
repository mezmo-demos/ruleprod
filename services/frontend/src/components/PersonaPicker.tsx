'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PERSONAS } from '@ruleprod/contracts';
import { signInAction } from '@/app/actions';
import styles from '@/app/signin/page.module.css';

interface Props {
  /** Where to land after signing in. */
  next: string;
  /** Persona already signed in, if any — its card reads as the current one. */
  currentPersonaId?: string;
}

export default function PersonaPicker({ next, currentPersonaId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (personaId: string) => {
    setChoosing(personaId);
    setError(null);

    const result = await signInAction(personaId);
    if (!result.success) {
      setError(result.error ?? 'We could not sign you in. Please try again.');
      setChoosing(null);
      return;
    }

    startTransition(() => {
      router.push(next);
      router.refresh();
    });
  };

  const busy = choosing !== null || pending;

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.grid}>
        {PERSONAS.map((persona) => {
          const isCurrent = persona.id === currentPersonaId;
          return (
            <li key={persona.id}>
              <button
                type="button"
                className={`${styles.card} ${isCurrent ? styles.cardCurrent : ''}`}
                onClick={() => void handlePick(persona.id)}
                disabled={busy}
                aria-current={isCurrent || undefined}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {persona.initials}
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{persona.name}</span>
                  <span className={styles.cardRole}>
                    {persona.role} · {persona.company}
                  </span>
                  <span className={styles.cardBlurb}>{persona.blurb}</span>
                </span>
                <span className={styles.cardCta}>
                  {choosing === persona.id
                    ? 'Signing in…'
                    : isCurrent
                      ? 'Signed in'
                      : 'Sign in'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
