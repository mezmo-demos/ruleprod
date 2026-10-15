import { registerOTel } from '@vercel/otel';

/**
 * @vercel/otel propagates trace context on outgoing fetch only to Vercel
 * deployment URLs and localhost, so calls into the cluster would start a new
 * trace at each backend. Matchers are URL prefixes, so the upstream base URLs
 * are exactly what is needed.
 */
function upstreamUrls(): string[] {
  return [
    process.env.CART_URL,
    process.env.CATALOG_URL,
    process.env.CHECKOUT_URL,
    process.env.ORDERS_URL,
  ].filter((url): url is string => Boolean(url));
}

/**
 * registerOTel only builds a MeterProvider when metricReaders is passed —
 * without it the frontend exports spans and no metrics at all, which is why it
 * showed up in Jaeger but was missing from every Grafana RED panel.
 *
 * Next runs this once per runtime. The metric exporter and the span filter are
 * Node-only, and src/proxy.ts puts us on the edge runtime as well, so they are
 * attached under a runtime guard and imported dynamically to keep them out of
 * the edge bundle. Edge still gets traces.
 */
export async function register() {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'frontend';
  const instrumentationConfig = { fetch: { propagateContextUrls: upstreamUrls() } };

  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    registerOTel({ serviceName, instrumentationConfig });
    return;
  }

  const [{ OTLPMetricExporter }, { PeriodicExportingMetricReader }, { spanProcessorsFromEnv }] =
    await Promise.all([
      import('@opentelemetry/exporter-metrics-otlp-proto'),
      import('@opentelemetry/sdk-metrics'),
      import('./lib/otel'),
    ]);

  registerOTel({
    serviceName,
    instrumentationConfig,
    spanProcessors: spanProcessorsFromEnv(),
    // Endpoint and protocol come from OTEL_EXPORTER_OTLP_*, set on the
    // Deployment; the exporter appends /v1/metrics itself. Temporality is left
    // at the default cumulative — Prometheus cannot ingest delta. The reader
    // ignores OTEL_METRIC_EXPORT_INTERVAL, so the interval is set here; keep it
    // in step with packages/telemetry/src/register.ts.
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: 5000,
      }),
    ],
  });
}
