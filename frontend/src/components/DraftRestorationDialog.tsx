import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DraftRestorationDialogProps {
  open: boolean
  /** Called when the user chooses to restore the saved draft */
  onRestore: () => void
  /** Called when the user chooses to discard the saved draft */
  onDiscard: () => void
}

/**
 * Dialog shown when unsaved form data from an earlier session is found in localStorage.
 * Presents two actions: Restore (continue where you left off) or Discard (start fresh).
 */
export default function DraftRestorationDialog({
  open,
  onRestore,
  onDiscard,
}: DraftRestorationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Unsaved data found</DialogTitle>
          <DialogDescription>
            You have unsaved data from earlier. Would you like to restore your draft?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onDiscard} className="flex-1">
            Discard
          </Button>
          <Button onClick={onRestore} className="flex-1">
            Restore draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
