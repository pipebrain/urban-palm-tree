/** M0 read-only preview preparation, separate from future workspace persistence. */
export type OfflineStatus = {
  state: "unsupported" | "preparing" | "ready" | "update-available" | "error";
  message: string;
  buildId?: string;
  assetCount?: number;
  byteCount?: number;
};

type WorkerStatus = {
  ready: boolean;
  buildId: string;
  assetCount?: number;
  byteCount?: number;
};

function queryWorker(worker: ServiceWorker): Promise<WorkerStatus> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(
        new Error("The browser did not confirm complete offline preparation."),
      );
    }, 15_000);
    channel.port1.onmessage = (event: MessageEvent<WorkerStatus>) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage({ type: "HVACR_OFFLINE_STATUS" }, [channel.port2]);
  });
}

/** Call from the production app. The returned cleanup only removes status listeners. */
export async function prepareOfflinePreview(
  onStatus: (status: OfflineStatus) => void,
): Promise<() => void> {
  if (
    !import.meta.env.PROD ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  ) {
    onStatus({
      state: "unsupported",
      message: import.meta.env.PROD
        ? "Offline preview requires a supported browser on HTTPS or localhost."
        : "Offline preview is checked in the production build.",
    });
    return () => undefined;
  }
  onStatus({
    state: "preparing",
    message:
      "Preparing the full dataset, app, and math fonts for offline preview…",
  });
  const cleanups: Array<() => void> = [];
  let disposed = false;
  const emit = (status: OfflineStatus) => {
    if (!disposed) onStatus(status);
  };
  try {
    const base = new URL(import.meta.env.BASE_URL, window.location.href);
    const registration = await navigator.serviceWorker.register(
      new URL("sw.js", base),
      {
        scope: base.pathname,
        updateViaCache: "none",
      },
    );
    const report = async () => {
      const worker = registration.active;
      if (!worker || worker.state !== "activated") return;
      try {
        const result = await queryWorker(worker);
        if (!result.ready) {
          emit({
            state: "error",
            message:
              "Offline preparation is incomplete or browser storage was removed. Reconnect and clear this app’s site data to prepare again.",
          });
          return;
        }
        const update = Boolean(registration.waiting);
        emit({
          state: update ? "update-available" : "ready",
          message: update
            ? "Offline preview prepared. A new build is waiting; close all app tabs to use it."
            : "Offline preview prepared. Close and reopen offline to verify this browser.",
          buildId: result.buildId,
          assetCount: result.assetCount,
          byteCount: result.byteCount,
        });
      } catch (error) {
        emit({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Offline status could not be checked.",
        });
      }
    };
    const observe = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const stateChanged = () => {
        if (worker.state === "redundant" && !registration.active) {
          emit({
            state: "error",
            message:
              "Offline preparation failed. Keep this preview online and retry after checking available browser storage.",
          });
        }
        void report();
      };
      worker.addEventListener("statechange", stateChanged);
      cleanups.push(() =>
        worker.removeEventListener("statechange", stateChanged),
      );
    };
    const updateFound = () => observe(registration.installing);
    registration.addEventListener("updatefound", updateFound);
    cleanups.push(() =>
      registration.removeEventListener("updatefound", updateFound),
    );
    observe(registration.installing);
    observe(registration.waiting);
    observe(registration.active);
    // Recheck cache retention when the app returns to the foreground.
    const visible = () => {
      if (document.visibilityState === "visible") void report();
    };
    document.addEventListener("visibilitychange", visible);
    cleanups.push(() =>
      document.removeEventListener("visibilitychange", visible),
    );
    await report();
  } catch (error) {
    emit({
      state: "error",
      message: `Offline preview unavailable: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return () => {
    disposed = true;
    cleanups.forEach((cleanup) => cleanup());
  };
}
