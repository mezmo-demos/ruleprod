import styles from "./page.module.css";
import { getCheckoutQuote } from "@/lib/checkout";
import CheckoutForm from "@/components/CheckoutForm";
import Link from "next/link";
import { Suspense } from "react";

export default async function CheckoutPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const promoCode = typeof searchParams?.promoCode === 'string' ? searchParams.promoCode : undefined;

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
        <CheckoutForm initialQuote={quote} />
      </Suspense>
    </main>
  );
}
