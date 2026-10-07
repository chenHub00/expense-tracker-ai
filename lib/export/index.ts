import { createExportService } from './exportService';
import { browserFileSaver } from './fileSaver';
import { defaultFormatRegistry } from './formats';

/** Composition root: the concrete formats and saver the app uses in the browser. */
export const defaultExportService = createExportService({
  formats: defaultFormatRegistry,
  saver: browserFileSaver,
});
