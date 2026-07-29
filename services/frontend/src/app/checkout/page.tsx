import styles from "./page.module.css";
import { getCheckoutQuote } from "@/lib/checkout";
import CheckoutForm from "@/components/CheckoutForm";
import Link from "next/link";

export default async function CheckoutPage() {
  let quote;
  try {
    quote = await getCheckoutQuote();
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
      <CheckoutForm initialQuote={quote} />
    </main>
  );
}
