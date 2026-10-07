'use client';

import { Modal } from '@/components/ui/Modal';
import { ExportForm } from './ExportForm';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Export expenses"
      description="Choose a format, narrow down the data and check the preview before downloading."
    >
      {/* Mounted only while open, so every opening starts from fresh options. */}
      <ExportForm onDone={onClose} />
    </Modal>
  );
}
