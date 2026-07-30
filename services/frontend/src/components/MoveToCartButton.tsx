'use client';

import { useState } from 'react';
import { moveToCartAction } from '@/app/actions';

interface Props {
  lineId: string;
  className?: string;
}

export default function MoveToCartButton({ lineId, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleMove = async () => {
    setBusy(true);
    await moveToCartAction(lineId);
    setBusy(false);
  };

  return (
    <button type="button" className={className} onClick={() => void handleMove()} disabled={busy}>
      {busy ? 'Moving…' : 'Move to cart'}
    </button>
  );
}
