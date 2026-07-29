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

  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    // Use the email prefix as a fake persona ID, or default to 'june'
    const personaId = email.split('@')[0] || 'june';
    const result = await createAccountAction(personaId);
    
    if (result.success) {
      router.push('/account');
    } else {
      alert(`Error: ${result.error}`);
      setIsSubmitting(false);
    }
  };

  return (
    <button className={styles.upsellBtn} onClick={handleCreateAccount} disabled={isSubmitting}>
      {isSubmitting ? 'Creating...' : 'Create account'}
    </button>
  );
}
