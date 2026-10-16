// Safe wrappers around Tauri's async event/invoke APIs.
//
// `listen()` resolves asynchronously. If a React effect cleans up before it
// resolves, a naive `.then(u => unlisten = u)` leaks the listener forever and
// duplicates accumulate. `listenTauri` disposes late-resolving listeners.
// Both helpers are silent no-ops when running in a plain browser.

export const listenTauri = (eventName, handler) => {
  let disposed = false;
  let unlisten = null;

  import('@tauri-apps/api/event')
    .then(({ listen }) => listen(eventName, handler))
    .then((u) => {
      if (disposed) u();
      else unlisten = u;
    })
    .catch(() => {});

  return () => {
    disposed = true;
    if (unlisten) unlisten();
  };
};

export const invokeTauri = (command, args) => {
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke(command, args))
    .catch(() => {});
};
