import Link from 'next/link';
import styles from './page.module.css';
import PersonaPicker from '@/components/PersonaPicker';
import { getPersona } from '@/lib/auth';

/** Only same-site paths are honoured, so ?next= can't bounce a visitor off-site. */
function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/account';
  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const persona = await getPersona();

  return (
    <main className={styles.main}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>Demo store</span>
        <h1 className="page-h1">Pick a persona</h1>
        <p className={styles.lede}>
          Rule Prod has no signup and no passwords — choose one of our regulars and
          the shop becomes theirs: their order history, their saved cart, their
          address at checkout. Anything already in your basket comes with you.
        </p>
      </div>

      <PersonaPicker next={safeNext(next)} currentPersonaId={persona?.id} />

      <p className={styles.footnote}>
        Prefer to look around first?{' '}
        <Link href="/catalog" className={styles.footnoteLink}>
          Keep browsing as a guest
        </Link>{' '}
        — you can pick a persona at checkout.
      </p>
    </main>
  );
}
