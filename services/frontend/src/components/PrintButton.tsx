'use client';

interface Props {
  label: string;
  className?: string;
}

/** The browser's own print dialog is the invoice — no PDF service to run. */
export default function PrintButton({ label, className }: Props) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}
