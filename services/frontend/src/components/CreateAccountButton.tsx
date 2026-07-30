'use client';

import { useState } from 'react';
import { createAccountAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import styles from '@/app/confirmation/page.module.css';

interface Props {
  email: string;
}

export default function CreateAccountButton({ email }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    setError(null);
    // Use the email prefix as a fake persona ID, or default to 'june'
    const personaId = email.split('@')[0] || 'june';
    const result = await createAccountAction(personaId);

    if (result.success) {
      router.push('/account');
    } else {
      setError(result.error ?? 'We could not create your account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button className={styles.upsellBtn} onClick={handleCreateAccount} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create account'}
      </button>
      {error && <p className={styles.upsellError} role="alert">{error}</p>}
    </>
  );
}
