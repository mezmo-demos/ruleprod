import styles from "./page.module.css";
import { getCheckoutQuote } from "@/lib/checkout";
import { getPersona } from "@/lib/auth";
import CheckoutForm, { type CheckoutDefaults } from "@/components/CheckoutForm";
import Link from "next/link";
import { Suspense } from "react";
import type { Persona } from "@ruleprod/contracts";

const GUEST_DEFAULTS: CheckoutDefaults = {
  email: '',
  firstName: '',
  lastName: '',
  streetAddress: '',
  city: '',
  state: '',
  zip: '',
};

/** A signed-in persona ships to its own address; a guest types their own. */
function defaultsFor(persona: Persona | undefined): CheckoutDefaults {
  if (!persona) return GUEST_DEFAULTS;
  const [firstName = '', ...rest] = persona.name.split(' ');
  const { street1, street2, city, state, zip } = persona.address;
  return {
    email: persona.email,
    firstName,
    lastName: rest.join(' '),
    streetAddress: street2 ? `${street1}, ${street2}` : street1,
    city,
    state,
    zip,
  };
}

export default async function CheckoutPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const promoCode = typeof searchParams?.promoCode === 'string' ? searchParams.promoCode : undefined;
  const persona = await getPersona();

  let quote;
  try {
    quote = await getCheckoutQuote(promoCode);
  } catch (e) {
    console.error(e);
  }

  if (!quote || quote.lines.length === 0) {
    return (
      <main className={styles.main}>
        <h1 className="page-h1">Your cart is empty</h1>
        <p style={{ marginTop: '16px' }}>
          <Link href="/catalog" style={{ color: 'var(--accent)', fontWeight: 600 }}>Explore our rulers →</Link>
        </p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className="page-h1" style={{ marginBottom: "40px" }}>Checkout</h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <CheckoutForm initialQuote={quote} defaults={defaultsFor(persona)} />
      </Suspense>
    </main>
  );
}
