'use client';

import { useState } from 'react';
import { saveCartAction } from '@/app/actions';
import styles from '@/app/cart/page.module.css';

interface Props {
  /** Class for the control that opens the form. */
  triggerClassName?: string;
}

/**
 * "Save this cart" opens a name field inline rather than firing a prompt() —
 * a native dialog would block the page (and the demo) until dismissed.
 */
export default function SaveCartForm({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);

    const result = await saveCartAction(name);
    setBusy(false);

    if (!result.success) {
      setError(result.error ?? 'We could not save this cart. Please try again.');
      return;
    }

    setName('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        Save this cart
      </button>
    );
  }

  return (
    <div className={styles.saveCartForm}>
      <input
        type="text"
        className={styles.saveCartInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave();
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Name this cart"
        aria-label="Name this cart"
        autoFocus
        maxLength={80}
      />
      <button
        type="button"
        className={styles.saveCartConfirm}
        onClick={() => void handleSave()}
        disabled={busy}
      >
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        className={styles.saveCartCancel}
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        disabled={busy}
      >
        Cancel
      </button>
      {error && (
        <p className={styles.saveCartError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
