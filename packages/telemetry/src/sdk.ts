/**
 * Starts the Node SDK. Equivalent to `@opentelemetry/auto-instrumentations-node/register`
 * plus Fastify route instrumentation, which auto-instrumentations-node does not ship.
 * Without it the HTTP server span never learns the matched route template, so
 * every request with a path parameter shows up downstream as its own operation.
 *
 * `registerOnInitialization` attaches the plugin to every Fastify instance created
 * after this module runs, so services need no code of their own.
 */
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { diag } from '@opentelemetry/api';
import {
  getNodeAutoInstrumentations,
  getResourceDetectors,
} from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations(),
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ],
  resourceDetectors: getResourceDetectors(),
});

sdk.start();

function shutdown(): void {
  sdk.shutdown().catch((err: unknown) => {
    diag.error('Error terminating OpenTelemetry SDK', err);
  });
}

process.on('SIGTERM', shutdown);
process.once('beforeExit', shutdown);
