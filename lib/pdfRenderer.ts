/**
 * Client-side High-DPI PDF to Image renderer for Sovereign OCR
 */
export async function renderPdfToDataUrls(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });
  
  const pdf = await loadingTask.promise;
  const dataUrls: string[] = [];

  const maxPages = Math.min(pdf.numPages, 5); // Support up to 5 pages per document
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crystal-clear OCR

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvas: canvas,
      canvasContext: context,
      viewport: viewport,
    }).promise;

    dataUrls.push(canvas.toDataURL("image/jpeg", 0.95));
  }

  return dataUrls;
}


