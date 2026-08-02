window.RUNE_TRACE_ANALYTICS_CONFIG = Object.freeze({
  activeEnvironment: "production",
  endpoints: Object.freeze({
    test: "",
    production:
      "https://script.google.com/macros/s/AKfycbyy8cKUCoayoV_d9_cehUwr-nXANfO5SuP83SGCZK7rzxx5ICMjIIR6rUqKIhVyTRQ9HQ/exec",
  }),
  testGroup: "external_prototype_v1.0.1",
  storageNamespace: "rune-trace",
  databaseName: "rune-trace-play-log",
  databaseVersion: 1,
  eventStoreName: "events",
  participantPrefix: "tester_",
  logPrefix: "RuneTracePlayLog",
  schemaVersion: 1,
  flushThreshold: 20,
  flushIntervalMs: 30000,
  idleTimeoutMs: 300000,
  maxBatchSize: 50,
  maxQueueSize: 5000,
  debug: true,
});
