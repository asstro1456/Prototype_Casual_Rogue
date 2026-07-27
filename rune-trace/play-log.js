(function createRuneTracePlayLog(global) {
  "use strict";

  const DB_NAME = "rune-trace-play-log";
  const DB_VERSION = 1;
  const EVENT_STORE = "events";
  const STORAGE_KEYS = {
    participantId: "rune-trace.participant-id",
    consent: "rune-trace.play-log-consent",
  };
  const DEFAULT_CONFIG = {
    activeEnvironment: "test",
    endpoints: { test: "", production: "" },
    testGroup: "internal_qa",
    schemaVersion: 1,
    flushThreshold: 20,
    flushIntervalMs: 30000,
    idleTimeoutMs: 300000,
    maxBatchSize: 50,
    maxQueueSize: 5000,
    debug: false,
  };

  let gameVersion = "unknown";
  let contextProvider = () => ({});
  let participantId = null;
  let sessionId = null;
  let sessionStartedAt = null;
  let sessionStarted = false;
  let sessionEnded = false;
  let backgroundStartedAt = null;
  let initialized = false;
  let dbPromise = null;
  let flushTimer = null;
  let flushInFlight = null;
  let retryAttempt = 0;
  let nextRetryAt = 0;
  let lastSuccessfulFlushAt = null;
  let successfulFlushCount = 0;
  let failedFlushCount = 0;
  let lastActivityAt = Date.now();

  function config() {
    const supplied = global.RUNE_TRACE_ANALYTICS_CONFIG ?? {};
    return {
      ...DEFAULT_CONFIG,
      ...supplied,
      endpoints: {
        ...DEFAULT_CONFIG.endpoints,
        ...(supplied.endpoints ?? {}),
      },
    };
  }

  function endpoint() {
    const current = config();
    return current.endpoints[current.activeEnvironment]?.trim() ?? "";
  }

  function isIdle() {
    return Date.now() - lastActivityAt >= config().idleTimeoutMs;
  }

  function markActivity() {
    const wasIdle = isIdle();
    lastActivityAt = Date.now();
    if (wasIdle) {
      debug("사용자 입력을 감지해 자동 전송을 재개합니다.");
      void flushQueue({ force: true });
    }
  }

  function debug(message, detail) {
    if (!config().debug) return;
    if (detail === undefined) {
      console.info(`[RuneTracePlayLog] ${message}`);
      return;
    }
    console.info(`[RuneTracePlayLog] ${message}`, detail);
  }

  function randomToken(length = 12) {
    if (global.crypto?.getRandomValues) {
      const values = new Uint8Array(Math.ceil(length / 2));
      global.crypto.getRandomValues(values);
      return [...values]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, length);
    }
    return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
      .slice(0, length)
      .padEnd(length, "0");
  }

  function storedValue(key) {
    try {
      return global.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storeValue(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch {
      debug("localStorage에 값을 저장하지 못했습니다.");
    }
  }

  function getParticipantId() {
    const existing = storedValue(STORAGE_KEYS.participantId);
    if (existing) return existing;
    const created = `tester_${randomToken(12)}`;
    storeValue(STORAGE_KEYS.participantId, created);
    return created;
  }

  function createSessionId() {
    const timestamp = new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);
    return `session_${timestamp}_${randomToken(8)}`;
  }

  function createEventId() {
    return `event_${Date.now()}_${randomToken(16)}`;
  }

  function getConsent() {
    const value = storedValue(STORAGE_KEYS.consent);
    return value === "granted" || value === "declined" ? value : null;
  }

  function detectPlatform() {
    const platform = global.navigator.userAgentData?.platform
      ?? global.navigator.platform
      ?? "";
    const userAgent = global.navigator.userAgent ?? "";
    if (/android/i.test(userAgent)) return "web_android";
    if (/win/i.test(platform)) return "web_windows";
    if (/mac/i.test(platform)) return "web_macos";
    if (/linux/i.test(platform)) return "web_linux";
    return "web_other";
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB is not supported."));
        return;
      }
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(EVENT_STORE)) {
          const store = database.createObjectStore(EVENT_STORE, {
            keyPath: "event_id",
          });
          store.createIndex("client_time_utc", "client_time_utc");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function runTransaction(mode, callback) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(EVENT_STORE, mode);
      const store = transaction.objectStore(EVENT_STORE);
      let result;
      try {
        result = callback(store, transaction);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function countQueuedEvents() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(EVENT_STORE, "readonly");
      const request = transaction.objectStore(EVENT_STORE).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function pruneQueue() {
    const maximum = config().maxQueueSize;
    const count = await countQueuedEvents();
    let remainingToDelete = Math.max(0, count - maximum);
    if (remainingToDelete === 0) return;

    await runTransaction("readwrite", (store) => {
      const request = store.index("client_time_utc").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || remainingToDelete === 0) return;
        cursor.delete();
        remainingToDelete -= 1;
        cursor.continue();
      };
    });
  }

  async function saveEvent(event) {
    await runTransaction("readwrite", (store) => {
      store.put(event);
    });
    await pruneQueue();
  }

  async function readEventBatch(limit) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const events = [];
      const transaction = database.transaction(EVENT_STORE, "readonly");
      const request = transaction
        .objectStore(EVENT_STORE)
        .index("client_time_utc")
        .openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || events.length >= limit) {
          resolve(events);
          return;
        }
        events.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteEvents(eventIds) {
    if (eventIds.length === 0) return;
    await runTransaction("readwrite", (store) => {
      eventIds.forEach((eventId) => store.delete(eventId));
    });
  }

  async function clearQueue() {
    try {
      await runTransaction("readwrite", (store) => store.clear());
    } catch (error) {
      debug("로컬 이벤트 큐를 비우지 못했습니다.", error);
    }
  }

  function safePayload(payload) {
    try {
      return JSON.parse(JSON.stringify(payload ?? {}));
    } catch {
      return { serialization_error: true };
    }
  }

  function createEvent(eventName, payload = {}) {
    const currentContext = contextProvider?.() ?? {};
    return {
      event_id: createEventId(),
      event_name: eventName,
      client_time_utc: new Date().toISOString(),
      participant_id: participantId,
      session_id: sessionId,
      game_version: gameVersion,
      schema_version: config().schemaVersion,
      platform: detectPlatform(),
      locale: global.navigator.language ?? "unknown",
      test_group: config().testGroup,
      stage_id: currentContext.stageId ?? null,
      floor_index: currentContext.floorIndex ?? null,
      payload: safePayload(payload),
    };
  }

  async function queueCreatedEvent(event, { flush = false } = {}) {
    if (getConsent() !== "granted") return null;
    try {
      await saveEvent(event);
      const queueSize = await countQueuedEvents();
      if (flush || queueSize >= config().flushThreshold) {
        void flushQueue({ force: true });
      }
      return event;
    } catch (error) {
      debug("이벤트를 IndexedDB에 저장하지 못했습니다.", error);
      return null;
    }
  }

  function log(eventName, payload = {}, options = {}) {
    if (getConsent() !== "granted" || !sessionId) {
      return Promise.resolve(null);
    }
    return queueCreatedEvent(createEvent(eventName, payload), options);
  }

  function backoffAfterFailure() {
    retryAttempt += 1;
    const baseDelay = Math.min(300000, 5000 * 2 ** (retryAttempt - 1));
    const jitter = Math.floor(Math.random() * 2000);
    nextRetryAt = Date.now() + baseDelay + jitter;
  }

  async function flushQueue({ force = false } = {}) {
    if (flushInFlight) return flushInFlight;
    if (getConsent() !== "granted") return { sent: 0, reason: "no_consent" };
    if (isIdle()) return { sent: 0, reason: "idle" };
    if (!endpoint()) return { sent: 0, reason: "endpoint_missing" };
    if (global.location.protocol === "file:") {
      return { sent: 0, reason: "https_required" };
    }
    if (Date.now() < nextRetryAt) {
      return { sent: 0, reason: "backoff" };
    }

    flushInFlight = (async () => {
      const events = await readEventBatch(config().maxBatchSize);
      if (events.length === 0) return { sent: 0, reason: "empty" };

      try {
        const response = await global.fetch(endpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=UTF-8",
          },
          body: JSON.stringify({ events }),
          redirect: "follow",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        if (!result.ok || !Array.isArray(result.acknowledged_event_ids)) {
          throw new Error(result.error ?? "Invalid server response.");
        }
        const rejectedEventIds = Array.isArray(result.rejected_events)
          ? result.rejected_events
              .map((entry) => entry.event_id)
              .filter((eventId) => typeof eventId === "string")
          : [];
        await deleteEvents([
          ...result.acknowledged_event_ids,
          ...rejectedEventIds,
        ]);
        retryAttempt = 0;
        nextRetryAt = 0;
        lastSuccessfulFlushAt = new Date().toISOString();
        successfulFlushCount += 1;
        if (rejectedEventIds.length > 0) {
          debug(
            `${rejectedEventIds.length}개 이벤트가 서버 검증에서 제외됐습니다.`,
            result.rejected_events,
          );
        }
        debug(`${result.acknowledged_event_ids.length}개 이벤트 전송 완료`);
        return {
          sent: result.acknowledged_event_ids.length,
          reason: "success",
        };
      } catch (error) {
        failedFlushCount += 1;
        backoffAfterFailure();
        debug("이벤트 전송 실패, 로컬 큐에 유지합니다.", error);
        return { sent: 0, reason: "network_error" };
      }
    })();

    try {
      return await flushInFlight;
    } finally {
      flushInFlight = null;
    }
  }

  function sendBeaconEvents(events) {
    if (
      events.length === 0 ||
      !endpoint() ||
      isIdle() ||
      global.location.protocol === "file:" ||
      !global.navigator.sendBeacon
    ) {
      return false;
    }
    const body = new Blob(
      [JSON.stringify({ events })],
      { type: "text/plain;charset=UTF-8" },
    );
    return global.navigator.sendBeacon(endpoint(), body);
  }

  function startSession(payload = {}) {
    if (getConsent() !== "granted" || sessionStarted) return;
    sessionStarted = true;
    sessionStartedAt = Date.now();
    void log("session_start", {
      returning_participant: Boolean(
        storedValue("rune-trace.has-played-before"),
      ),
      ...payload,
    });
    storeValue("rune-trace.has-played-before", "true");
  }

  function handleVisibilityChange() {
    if (!sessionStarted || sessionEnded) return;
    if (global.document.visibilityState === "hidden") {
      backgroundStartedAt = Date.now();
      void log("app_background", {
        active_time_ms: Date.now() - sessionStartedAt,
      }, { flush: true });
      return;
    }
    if (backgroundStartedAt !== null) {
      const interruptionDuration = Date.now() - backgroundStartedAt;
      backgroundStartedAt = null;
      void log("app_resume", {
        interruption_duration_ms: interruptionDuration,
      });
    }
  }

  function handlePageHide() {
    if (
      getConsent() !== "granted" ||
      !sessionStarted ||
      sessionEnded
    ) {
      return;
    }
    sessionEnded = true;
    const events = [];
    const currentContext = contextProvider?.() ?? {};
    if (currentContext.running) {
      events.push(createEvent("stage_quit", {
        reason: "page_hide",
        completed_runes: currentContext.completedRunes ?? null,
      }));
    }
    events.push(createEvent("session_end", {
      active_time_ms: Date.now() - sessionStartedAt,
      reason: "page_hide",
    }));
    events.forEach((event) => {
      void queueCreatedEvent(event);
    });
    sendBeaconEvents(events);
  }

  async function setConsent(granted) {
    storeValue(STORAGE_KEYS.consent, granted ? "granted" : "declined");
    if (!granted) {
      await clearQueue();
    }
    return getConsent();
  }

  async function getStatus() {
    let queuedEvents = null;
    try {
      queuedEvents = await countQueuedEvents();
    } catch {
      queuedEvents = null;
    }
    return {
      consent: getConsent(),
      participantId,
      sessionId,
      environment: config().activeEnvironment,
      endpointConfigured: Boolean(endpoint()),
      idle: isIdle(),
      lastActivityAt: new Date(lastActivityAt).toISOString(),
      queuedEvents,
      successfulFlushCount,
      failedFlushCount,
      lastSuccessfulFlushAt,
      nextRetryAt: nextRetryAt
        ? new Date(nextRetryAt).toISOString()
        : null,
    };
  }

  function init(options = {}) {
    if (initialized) return;
    initialized = true;
    gameVersion = options.gameVersion ?? gameVersion;
    contextProvider = options.getContext ?? contextProvider;
    participantId = getParticipantId();
    sessionId = createSessionId();
    void openDatabase().catch((error) => {
      debug("IndexedDB 초기화에 실패했습니다.", error);
    });
    flushTimer = global.setInterval(
      () => void flushQueue(),
      config().flushIntervalMs,
    );
    global.document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
    global.addEventListener("pagehide", handlePageHide);
    global.addEventListener("online", () => void flushQueue({ force: true }));
    ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
      global.addEventListener(eventName, markActivity, {
        capture: true,
        passive: true,
      });
    });
    debug("초기화 완료");
  }

  global.RuneTracePlayLog = Object.freeze({
    init,
    getConsent,
    setConsent,
    startSession,
    log,
    flush: () => {
      markActivity();
      return flushQueue({ force: true });
    },
    getStatus,
  });
})(window);
