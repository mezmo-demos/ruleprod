import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getOrder } from "@/lib/orders";
import { formatCents, resolveImage } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;

  if (!orderId) {
    // Fallback to static if no orderId, or show "Latest Order"
    // For this demo, let's just show a generic success if no ID
    return (
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.successCircle}>✓</div>
          <h1 className={styles.pageH1}>Your order is placed</h1>
          <p className={styles.lede}>
            We&apos;ve received your order and are processing it now.
          </p>
        </div>
        <div className={styles.actions}>
           <Link href="/catalog" className={styles.outlinePill}>Continue shopping</Link>
        </div>
      </main>
    );
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (e) {
    console.error(e);
    notFound();
  }

  return (
    <main className={styles.main}>
      
      <div className={styles.header}>
        <div className={styles.successCircle}>✓</div>
        <h1 className={styles.pageH1}>Order {order.orderNumber} is placed</h1>
        <p className={styles.lede}>
          We&apos;ve sent a confirmation email to <strong>{order.contact.email}</strong>. Since this is a net-30 account order, no payment was taken today.
        </p>
      </div>

      <div className={styles.receiptCard}>
        <div className={styles.receiptHeader}>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Order</span>
            <span className={styles.receiptValue}>{order.orderNumber}</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Placed</span>
            <span className={styles.receiptValue}>{new Date(order.placedAt).toLocaleDateString()}</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Arrives</span>
            <span className={styles.receiptValue}>{new Date(order.arrivesEstimate).toLocaleDateString()}</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Total</span>
            <span className={styles.receiptValue}>{formatCents(order.totalCents)}</span>
          </div>
        </div>

        <div className={styles.receiptBody}>
          {order.lines.map((line, i) => (
            <div key={i} className={styles.receiptItem}>
              <div className={styles.itemThumb}>
                <Image src={resolveImage(line.image)} alt={line.title} fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.itemDetails}>
                <h4 className={styles.itemTitle}>{line.title}</h4>
                <p className={styles.itemSpec}>{line.variantLabel}</p>
              </div>
              <div className={styles.itemPriceCol}>
                <span className={styles.itemPrice}>{formatCents(line.unitPriceCents)}</span>
                <span className={styles.itemQty}>Qty: {line.qty}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.receiptFooter}>
          <div className={styles.footerBlock}>
            <h4 className={styles.footerLabel}>Shipping to</h4>
            <p className={styles.footerValue}>{order.shippingAddress.name}</p>
            <p className={styles.footerValue}>{order.shippingAddress.street1}</p>
            {order.shippingAddress.street2 && <p className={styles.footerValue}>{order.shippingAddress.street2}</p>}
            <p className={styles.footerValue}>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
          </div>
          <div className={styles.footerBlock}>
            <h4 className={styles.footerLabel}>Payment</h4>
            <p className={styles.footerValue}>Invoice — net 30</p>
            <p className={styles.footerNote}>No card was charged — demo store</p>
          </div>
        </div>
      </div>

      <div className={styles.upsellBand}>
        <div className={styles.upsellText}>
          <h3 className={styles.upsellTitle}>Keep this order in your history</h3>
          <p className={styles.upsellBody}>Create a free account to track this shipment, save carts, and speed through checkout next time.</p>
        </div>
        <button className={styles.upsellBtn}>Create account</button>
      </div>

      <div className={styles.actions}>
        <Link href="/account" className={styles.outlinePill}>Track this order</Link>
        <Link href="/catalog" className={styles.outlinePill}>Continue shopping</Link>
      </div>

    </main>
  );
}
