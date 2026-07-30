'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/app/actions';

interface Props {
  className?: string;
}

export default function SignOutButton({ className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutAction();
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      className={className}
      onClick={() => void handleSignOut()}
      disabled={signingOut || pending}
    >
      {signingOut || pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
