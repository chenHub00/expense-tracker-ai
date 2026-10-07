'use client';

import { createContext, useContext } from 'react';
import { defaultExportService } from '@/lib/export';
import type { ExportService } from '@/lib/export/exportService';

const ExportServiceContext = createContext<ExportService>(defaultExportService);

/** Overrides the export service for a subtree, e.g. a fake saver in tests or another destination. */
export const ExportServiceProvider = ExportServiceContext.Provider;

export function useExportService(): ExportService {
  return useContext(ExportServiceContext);
}
