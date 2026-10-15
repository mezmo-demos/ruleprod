/**
 * OTel bootstrap. Run services as:
 *   node --import @ruleprod/telemetry/register dist/index.js
 * with OTEL_SERVICE_NAME set. Defaults target the in-cluster collector;
 * set OTEL_SDK_DISABLED=true to opt out (local dev without a collector).
 */
process.env.OTEL_SERVICE_NAME ??= 'ruleprod-service';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??= 'http://otel-collector.otel.svc.cluster.local:4318';
process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= 'http/protobuf';
process.env.OTEL_NODE_DISABLED_INSTRUMENTATIONS ??= 'fs,dns,net';
process.env.OTEL_NODE_RESOURCE_DETECTORS ??= 'env,host,os,process';
// SDK default is 60s, which delays metric-based Grafana alerts by up to ~2m.
// Frontend sets its own interval in services/frontend/src/instrumentation.ts.
process.env.OTEL_METRIC_EXPORT_INTERVAL ??= '5000';

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  await import('./sdk.js');
}
