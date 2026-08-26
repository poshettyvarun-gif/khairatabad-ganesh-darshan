"use client";

import { useState } from "react";

export function PdfDownloadButton({ bookingId }: { bookingId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadPass() {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/pdf`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/pdf")) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "The PDF pass could not be generated.");
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("The PDF pass was empty. Please try again.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Khairatabad_Ganesh_Darshan_${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "The PDF pass could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-5">
      <button className="btn btn-primary" disabled={downloading} onClick={downloadPass} type="button">
        {downloading ? "Preparing PDF…" : "Download PDF Pass"}
      </button>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
