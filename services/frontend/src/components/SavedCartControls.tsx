'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSavedCartAction, restoreSavedCartAction } from '@/app/actions';

interface Props {
  savedCartId: string;
  name: string;
  /** Class for the primary (Restore) control. */
  restoreClassName?: string;
  /** Class for the secondary (Delete) control. */
  deleteClassName?: string;
  errorClassName?: string;
}

export default function SavedCartControls({
  savedCartId,
  name,
  restoreClassName,
  deleteClassName,
  errorClassName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'restore' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    which: 'restore' | 'delete',
    action: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    setBusy(which);
    setError(null);

    const result = await action();
    if (!result.success) {
      setError(result.error ?? 'That did not work. Please try again.');
      setBusy(null);
      return;
    }

    startTransition(() => {
      router.refresh();
      setBusy(null);
    });
  };

  const disabled = busy !== null || pending;

  return (
    <>
      <button
        type="button"
        className={restoreClassName}
        // Merge, not replace: restoring must never silently bin a live cart.
        onClick={() => void run('restore', () => restoreSavedCartAction(savedCartId, 'merge'))}
        disabled={disabled}
      >
        {busy === 'restore' ? 'Restoring…' : 'Restore'}
      </button>
      <button
        type="button"
        className={deleteClassName}
        onClick={() => void run('delete', () => deleteSavedCartAction(savedCartId))}
        disabled={disabled}
        aria-label={`Delete saved cart ${name}`}
      >
        {busy === 'delete' ? 'Deleting…' : 'Delete'}
      </button>
      {error && (
        <p className={errorClassName} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
