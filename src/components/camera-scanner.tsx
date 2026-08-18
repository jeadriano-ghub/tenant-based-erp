"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

type Props = {
  onDetected: (result: { barcode: string }) => void;
};

export default function CameraScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const start = async () => {
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const videoInputDevices = await reader.listVideoInputDevices();
      const deviceId = videoInputDevices[0]?.deviceId;
      if (!deviceId) throw new Error("No camera found.");
      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result) => {
        if (result) {
          onDetected({ barcode: result.getText() });
          stop();
        }
      });
      setActive(true);
    } catch (e) {
      setError((e as Error).message);
      setActive(false);
    }
  };

  const stop = () => {
    try {
      readerRef.current?.reset();
    } catch {}
    readerRef.current = null;
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={active ? stop : start} className="rounded-lg border px-3 py-2 text-sm hover:bg-[var(--background)]">
          {active ? "Stop camera" : "Start camera"}
        </button>
        <span className="text-xs text-[var(--muted)]">Point at a barcode or QR code.</span>
      </div>
      <video ref={videoRef} className="mt-2 w-full rounded-lg bg-black" playsInline />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
