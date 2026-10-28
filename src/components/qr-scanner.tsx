import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle, X } from "lucide-react";

/**
 * Camera QR reader for the reception desk.
 *
 * The decoding library is loaded only after the panel is opened, and only in the
 * browser: it touches `navigator`/`MediaDevices`, which do not exist during
 * server rendering. If the camera is missing, blocked or in use, the panel says
 * so and the receptionist can type the pass code instead — scanning is a
 * convenience, never the only way in.
 */
export function QrScanner({ onToken, disabled }: { onToken: (token: string) => void; disabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastRef = useRef<string>("");
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const [state, setState] = useState<"idle" | "starting" | "scanning" | "blocked">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    lastRef.current = "";
    setState("idle");
  }

  // Always release the camera when the panel goes away, otherwise the device
  // stays claimed and the next page load can't open it.
  useEffect(() => () => stopRef.current?.(), []);

  async function start() {
    if (state !== "idle" || !videoRef.current) return;
    setState("starting");
    setMessage(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        const token = result?.getText()?.trim();
        if (!token || token === lastRef.current) return;
        lastRef.current = token;
        onTokenRef.current(token);
      });
      stopRef.current = () => controls.stop();
      setState("scanning");
    } catch {
      stopRef.current?.();
      stopRef.current = null;
      setState("blocked");
      setMessage("Camera not available here. Type the pass code below instead.");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Scan a member pass</p>
        {state === "scanning" && (
          <button type="button" onClick={stop} className="inline-flex items-center gap-1 text-sm text-primary">
            <X className="h-4 w-4" /> Stop camera
          </button>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-md bg-muted">
        <video
          ref={videoRef}
          aria-label="Camera preview"
          muted
          playsInline
          className={`h-48 w-full object-cover ${state === "scanning" ? "" : "hidden"}`}
        />
        {state !== "scanning" && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-4 text-center">
            {state === "starting" ? (
              <>
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Opening camera…</p>
              </>
            ) : state === "blocked" ? (
              <>
                <CameraOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </>
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Point the camera at a member's QR pass.</p>
                <button
                  type="button"
                  onClick={start}
                  disabled={disabled}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Start camera
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {state === "scanning" && <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">Scanning…</p>}
    </div>
  );
}
