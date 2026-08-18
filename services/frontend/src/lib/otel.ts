import { parseKeyPairsIntoRecord } from '@opentelemetry/core';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPHttpJsonTraceExporter, OTLPHttpProtoTraceExporter } from '@vercel/otel';

/**
 * With src/proxy.ts present, Next.js handles every matched request twice: once
 * to run the proxy, and once to render. The proxy pass ends by throwing a
 * bubbled error back to the router, so its BaseServer.handleRequest span is
 * marked `next.bubble` and never gets `http.route`. Both passes produce a
 * SERVER span under the same parent, so the proxy pass doubles every request
 * in span-based service graphs and pulls route latency down toward its
 * sub-millisecond duration. Its only child is the proxy execution span, which
 * would be orphaned, so it goes too.
 */
function isProxyPassSpan(span: ReadableSpan): boolean {
  return (
    span.attributes['next.bubble'] === true ||
    span.attributes['next.span_type'] === 'Middleware.execute'
  );
}

/** Forwards to `inner` only the spans that pass `keep`. */
class FilteringSpanProcessor implements SpanProcessor {
  constructor(
    private readonly inner: SpanProcessor,
    private readonly keep: (span: ReadableSpan) => boolean,
  ) {}

  onStart(...args: Parameters<SpanProcessor['onStart']>): void {
    this.inner.onStart(...args);
  }

  onEnd(span: ReadableSpan): void {
    if (this.keep(span)) {
      this.inner.onEnd(span);
    }
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }
}

/**
 * The OTLP trace exporter @vercel/otel builds for `spanProcessors: ["auto"]`,
 * driven by the same OTEL_EXPORTER_OTLP_* variables. Rebuilt here because the
 * "auto" processor cannot be wrapped, and passing `traceExporter` alongside it
 * exports every span twice once OTEL_EXPORTER_OTLP_ENDPOINT is set.
 */
function traceExporterFromEnv(): SpanExporter {
  const env = process.env;
  const protocol =
    env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL ?? env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf';
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/+$/, '');
  const url =
    env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || (endpoint ? `${endpoint}/v1/traces` : undefined);
  const headers = {
    ...parseKeyPairsIntoRecord(env.OTEL_EXPORTER_OTLP_HEADERS),
    ...parseKeyPairsIntoRecord(env.OTEL_EXPORTER_OTLP_TRACES_HEADERS),
  };

  return protocol === 'http/json'
    ? new OTLPHttpJsonTraceExporter({ url, headers })
    : new OTLPHttpProtoTraceExporter({ url, headers });
}

export function spanProcessorsFromEnv(): SpanProcessor[] {
  return [
    new FilteringSpanProcessor(
      new BatchSpanProcessor(traceExporterFromEnv()),
      (span) => !isProxyPassSpan(span),
    ),
  ];
}
