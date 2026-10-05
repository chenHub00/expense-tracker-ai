import type { ExportFormat } from './reports';

export type DestinationId = 'download' | 'email' | 'google-sheets' | 'google-drive' | 'dropbox' | 'onedrive';

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  /** Short monogram shown in the service tile. */
  mark: string;
  /** Tailwind classes for the service tile. */
  tile: string;
  description: string;
  /** Simulated services need a (mock) connection before use. */
  requiresConnection: boolean;
  simulated: boolean;
  formats: ExportFormat[];
  /** Progress steps shown while a job runs; the last one is where the result lands. */
  stages: string[];
  /** Where a finished export lives, e.g. a folder path. */
  location: (filename: string) => string;
}

export const DESTINATIONS: DestinationDefinition[] = [
  {
    id: 'download',
    name: 'This device',
    mark: '↓',
    tile: 'bg-slate-900 text-white',
    description: 'Save a file straight to your downloads folder.',
    requiresConnection: false,
    simulated: false,
    formats: ['csv', 'json', 'md'],
    stages: ['Preparing data', 'Generating file', 'Saving to device'],
    location: (f) => `Downloads/${f}`,
  },
  {
    id: 'email',
    name: 'Email',
    mark: '@',
    tile: 'bg-sky-500 text-white',
    description: 'Send the report as an attachment to anyone.',
    requiresConnection: false,
    simulated: true,
    formats: ['csv', 'json', 'md'],
    stages: ['Preparing data', 'Generating attachment', 'Sending email'],
    location: () => 'Sent',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    mark: 'GS',
    tile: 'bg-green-600 text-white',
    description: 'Create a live spreadsheet with formatted columns and totals.',
    requiresConnection: true,
    simulated: true,
    formats: ['csv'],
    stages: ['Preparing data', 'Creating spreadsheet', 'Writing rows', 'Applying formatting'],
    location: (f) => `My Drive/Expense Tracker/${f.replace(/\.\w+$/, '')}`,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    mark: 'GD',
    tile: 'bg-amber-400 text-slate-900',
    description: 'Store files in a synced Drive folder.',
    requiresConnection: true,
    simulated: true,
    formats: ['csv', 'json', 'md'],
    stages: ['Preparing data', 'Generating file', 'Uploading to Drive'],
    location: (f) => `My Drive/Expense Tracker/${f}`,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    mark: 'DB',
    tile: 'bg-blue-600 text-white',
    description: 'Keep backups in your Dropbox app folder.',
    requiresConnection: true,
    simulated: true,
    formats: ['csv', 'json', 'md'],
    stages: ['Preparing data', 'Generating file', 'Uploading to Dropbox'],
    location: (f) => `/Apps/Expense Tracker/${f}`,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    mark: 'OD',
    tile: 'bg-sky-700 text-white',
    description: 'Save to OneDrive for Office and Excel users.',
    requiresConnection: true,
    simulated: true,
    formats: ['csv', 'json', 'md'],
    stages: ['Preparing data', 'Generating file', 'Uploading to OneDrive'],
    location: (f) => `OneDrive/Documents/Expense Tracker/${f}`,
  },
];

export const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d])) as Record<
  DestinationId,
  DestinationDefinition
>;
