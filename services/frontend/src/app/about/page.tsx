import Link from "next/link";
import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>The ultimate arbiter of truth.</h1>
          <p className={styles.subtitle}>
            Rule Prod was founded on a simple premise: precision matters.
          </p>
        </div>

        <div className={styles.body}>
          <p>
            Whether you&apos;re cutting fabric, framing a house, drafting a blueprint, or simply trying to draw a straight line, the tool you use determines the quality of your output. We believe that measurement is the foundation of all great work, and that the instruments you use should be as reliable as the effort you put into your craft.
          </p>
          
          <h2>Curated for quality</h2>
          <p>
            We source and curate the finest measurement instruments from around the globe. We believe in tools that last a lifetime, which is why you&apos;ll find spring-tempered steel, boxwood, and machined aluminum throughout our catalog. We cater to the tradesperson who needs a tool that can survive the site, the studio artist who demands unyielding straight edges, and the classroom that requires durability by the crate.
          </p>

          <h2>The vintage archive</h2>
          <p>
            In addition to our modern catalog, we maintain a vintage archive to preserve the history of measurement. Before the pocket calculator, precision engineering relied on the physical manipulation of logarithms. Our collection of pristine mid-century slide rules and antique folding rules serves as a tribute to the tools that built the modern world.
          </p>

          <div className={styles.demoCallout}>
            <h3>A Demonstration Store</h3>
            <p>
              While our dedication to the aesthetics of measurement is genuine, Rule Prod is a fictional storefront. It exists as a realistic, modern e-commerce demo application designed to showcase <strong>Mezmo observability</strong>. The site operates across five microservices on Kubernetes, allowing engineers to explore distributed tracing, logging, and metrics in a tangible environment. No payment is ever taken.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
