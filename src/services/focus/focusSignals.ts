export type FocusState = "confirmed-foreground" | "confirmed-lost" | "hidden" | "ambiguous-iframe";

export interface FocusSnapshot {
  visibility: DocumentVisibilityState;
  hasFocus: boolean;
  iframeActive: boolean;
}

export interface FocusSignalSource {
  snapshot(): FocusSnapshot;
  subscribe(listener: (snapshot: FocusSnapshot) => void): () => void;
}

export function classifyFocus(snapshot: FocusSnapshot): FocusState {
  if (snapshot.visibility === "hidden") return "hidden";
  if (snapshot.hasFocus) return "confirmed-foreground";
  if (snapshot.iframeActive) return "ambiguous-iframe";
  return "confirmed-lost";
}

export class BrowserFocusSignalSource implements FocusSignalSource {
  constructor(private readonly getPlayerIframe: () => HTMLIFrameElement | null) {}

  snapshot(): FocusSnapshot {
    const iframe = this.getPlayerIframe();
    return {
      visibility: document.visibilityState,
      hasFocus: document.hasFocus(),
      iframeActive: !!iframe && document.activeElement === iframe,
    };
  }

  subscribe(listener: (snapshot: FocusSnapshot) => void): () => void {
    let queued = false;
    const publish = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        listener(this.snapshot());
      });
    };
    document.addEventListener("visibilitychange", publish);
    window.addEventListener("focus", publish);
    window.addEventListener("blur", publish);
    return () => {
      document.removeEventListener("visibilitychange", publish);
      window.removeEventListener("focus", publish);
      window.removeEventListener("blur", publish);
    };
  }
}
