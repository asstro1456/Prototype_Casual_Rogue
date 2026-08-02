// Copy this file to your project and replace the placeholder values.
window.RUNE_TRACE_ANALYTICS_CONFIG = Object.freeze({
  activeEnvironment: "production",
  endpoints: Object.freeze({
    test: "",
    production: "YOUR_APPS_SCRIPT_EXEC_URL",
  }),
  testGroup: "your_project",
  storageNamespace: "your-project",
  databaseName: "your-project-play-log",
  databaseVersion: 1,
  eventStoreName: "events",
  participantPrefix: "participant_",
  logPrefix: "PlayLog",
  schemaVersion: 1,
  flushThreshold: 20,
  flushIntervalMs: 30000,
  idleTimeoutMs: 300000,
  reconnectGraceMs: 300000,
  maxBatchSize: 50,
  maxQueueSize: 5000,
  debug: false,
});
