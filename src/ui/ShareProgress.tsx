import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryStateV1 } from "../domain/library";
import { selectShareProgress } from "../domain/shareProgress";
import { buildShareCardSvg, shareCardAlt, type ShareCardVariant } from "./shareCardSvg";

const CARD_LABELS: Record<ShareCardVariant, string> = { daily: "Daily focus", recap: "Learning recap", goal: "Goal reached" };

export async function renderSharePng(svgMarkup: string): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const source = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = source;
    if (typeof image.decode === "function") await image.decode();
    else await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The progress card could not be rendered."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG export is not available in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png || png.type !== "image/png") throw new Error("PNG export failed. Try a different browser.");
    return png;
  } finally {
    URL.revokeObjectURL(source);
  }
}

function supportsPngFileShare(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([""], "focus-progress.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "k12learn2gether-focus-progress.png";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ShareProgress = memo(function ShareProgress({
  library,
  resourceId,
  buttonLabel = "Share progress",
}: {
  library: LibraryStateV1;
  resourceId: string;
  buttonLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<ReturnType<typeof selectShareProgress> | null>(null);
  const [variant, setVariant] = useState<ShareCardVariant>("daily");
  const [includeResource, setIncludeResource] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => setShareAvailable(supportsPngFileShare()), []);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, [isOpen]);

  const svg = useMemo(() => data ? buildShareCardSvg(data, variant, includeResource) : "", [data, variant, includeResource]);
  const previewSrc = useMemo(() => svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "", [svg]);

  function openShare(): void {
    const next = selectShareProgress(library, resourceId, new Date());
    setData(next);
    setVariant(next.goalReached ? "goal" : "daily");
    setIncludeResource(false);
    setStatus("");
    setIsOpen(true);
  }

  function closeShare(): void {
    setIsOpen(false);
  }

  async function createCard(): Promise<Blob | null> {
    if (!data) return null;
    setBusy(true);
    setStatus("Preparing your PNG…");
    try {
      return await renderSharePng(svg);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PNG export failed. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng(): Promise<void> {
    const png = await createCard();
    if (!png) return;
    downloadBlob(png);
    setStatus("Your PNG is ready to share.");
  }

  async function sharePng(): Promise<void> {
    const png = await createCard();
    if (!png) return;
    const file = new File([png], "k12learn2gether-focus-progress.png", { type: "image/png" });
    try {
      if (!supportsPngFileShare()) {
        downloadBlob(png);
        setStatus("Image sharing is not available here, so your PNG was downloaded.");
        return;
      }
      await navigator.share({ files: [file], title: "My Focus Cup", text: "Recorded focus toward a goal I chose." });
      setStatus("Your progress card was shared.");
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "AbortError" ? "Sharing canceled." : "Sharing did not complete. You can download the PNG instead.");
    }
  }

  return <>
    <button className="button button-share" type="button" onClick={openShare}>{buttonLabel} <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} className="share-dialog" aria-labelledby="share-dialog-title" aria-modal="true" onCancel={(event) => { event.preventDefault(); closeShare(); }} onClose={() => setIsOpen(false)}>
      {data && <>
        <header className="share-dialog-header"><div><p className="eyebrow">A REAL STUDY RECORD</p><h2 id="share-dialog-title">Share your progress</h2></div><button className="share-close" type="button" onClick={closeShare} aria-label="Close share progress dialog">×</button></header>
        <div className="share-dialog-content">
          <div className="share-variants" role="group" aria-label="Share card type">
            {(["daily", "recap", ...(data.goalReached ? ["goal"] : [])] as ShareCardVariant[]).map((option) => <button key={option} type="button" aria-pressed={variant === option} onClick={() => { setVariant(option); setStatus(""); }}>{CARD_LABELS[option]}</button>)}
          </div>
          <div className="share-preview"><img src={previewSrc} alt={shareCardAlt(data, variant)} /></div>
          <p className="share-date-note">Date totals come from eligible activity recorded in this browser. Older focus totals may have no dates.</p>
          {data.resourceTitle && <label className="share-resource-toggle"><input type="checkbox" checked={includeResource} onChange={(event) => setIncludeResource(event.target.checked)} /> Include subject and resource title</label>}
        </div>
        <footer className="share-dialog-actions">
          <p className="share-fallback">{shareAvailable ? "Share a PNG with apps that accept image files." : "Download the PNG, then share it on WhatsApp, Instagram, Snapchat, X, or anywhere you like."}</p>
          {status && <p className="share-status" role="status" aria-live="polite">{status}</p>}
          <div><button className="button button-outline" type="button" disabled={busy} onClick={() => void downloadPng()}>{busy ? "Preparing…" : "Download PNG"}</button>{shareAvailable && <button className="button button-ink" type="button" disabled={busy} onClick={() => void sharePng()}>{busy ? "Preparing…" : "Share image"}</button>}</div>
        </footer>
      </>}
    </dialog>
  </>;
});
