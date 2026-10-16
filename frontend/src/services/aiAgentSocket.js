// Connects the pet to local AI agent / terminal execution events.
// Works via:
// 1. Tauri IPC event "ai-agent-event" (triggered by curl "http://127.0.0.1:17380/?state=THINKING&msg=Analyzing...")
// 2. Window CustomEvent "comnyang-agent" for browser/UI testing
import { listenTauri } from './tauriEvents';

export const subscribeToAiAgent = (onAgentEvent) => {
  const handleBrowserEvent = (e) => {
    if (e.detail) {
      onAgentEvent(e.detail);
    }
  };

  window.addEventListener('comnyang-agent', handleBrowserEvent);

  const unlistenTauri = listenTauri('ai-agent-event', (event) => {
    if (event.payload) {
      onAgentEvent(event.payload);
    }
  });

  return () => {
    window.removeEventListener('comnyang-agent', handleBrowserEvent);
    unlistenTauri();
  };
};

export const triggerAgentSimulation = () => {
  window.dispatchEvent(
    new CustomEvent('comnyang-agent', {
      detail: { state: 'THINKING', message: 'Agent reasoning...' },
    })
  );

  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('comnyang-agent', {
        detail: { state: 'SUCCESS', message: 'Build & Task Complete! ✨' },
      })
    );
  }, 4500);
};
