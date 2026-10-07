import type { ExportFormat } from './format';

export const PDF_MIME_TYPE = 'application/pdf';

export const pdfFormat: ExportFormat = {
  id: 'pdf',
  label: 'PDF',
  extension: 'pdf',
  mimeType: PDF_MIME_TYPE,
  description: 'A formatted report, ready to print or share',
  async serialize(document) {
    // Loaded on demand so the PDF libraries are not part of the initial bundle.
    const { renderPdf } = await import('./pdfRenderer');
    return renderPdf(document);
  },
};
