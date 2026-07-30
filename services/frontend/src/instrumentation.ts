import { registerOTel } from "@vercel/otel";

/**
 * registerOTel only builds a MeterProvider when metricReaders is passed —
 * without it the frontend exports spans and no metrics at all, which is why it
 * showed up in Jaeger but was missing from every Grafana RED panel.
 *
 * Next runs this once per runtime. The metric exporter is Node-only, and
 * src/proxy.ts puts us on the edge runtime as well, so the reader is attached
 * under a runtime guard and imported dynamically to keep it out of the edge
 * bundle. Edge still gets traces.
 */
export async function register() {
  const serviceName = process.env.OTEL_SERVICE_NAME || "frontend";

  if (process.env.NEXT_RUNTIME !== "nodejs") {
    registerOTel({ serviceName });
    return;
  }

  const [{ OTLPMetricExporter }, { PeriodicExportingMetricReader }] = await Promise.all([
    import("@opentelemetry/exporter-metrics-otlp-proto"),
    import("@opentelemetry/sdk-metrics"),
  ]);

  registerOTel({
    serviceName,
    // Endpoint and protocol come from OTEL_EXPORTER_OTLP_*, set on the
    // Deployment; the exporter appends /v1/metrics itself. Temporality is left
    // at the default cumulative — Prometheus cannot ingest delta.
    metricReaders: [
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    ],
  });
}
