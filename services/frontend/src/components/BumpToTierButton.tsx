'use client';

import { useState } from 'react';
import { updateCartItemAction } from '@/app/actions';

interface Props {
  lineId: string;
  /** Quantity the next bulk tier starts at. */
  minQty: number;
  className?: string;
}

/** Takes the bulk nudge at its word: sets the line to the tier's quantity. */
export default function BumpToTierButton({ lineId, minQty, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleBump = async () => {
    setBusy(true);
    await updateCartItemAction(lineId, minQty);
    setBusy(false);
  };

  return (
    <button type="button" className={className} onClick={() => void handleBump()} disabled={busy}>
      {busy ? 'Updating…' : `Bump to ${minQty}`}
    </button>
  );
}
