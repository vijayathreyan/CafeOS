import React, { useCallback, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── Toast helper ─────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export function showToast(title: string, variant: ToastVariant = 'info') {
  if (variant === 'error') {
    toast({ title, variant: 'destructive' })
  } else if (variant === 'success') {
    toast({ title, className: 'bg-green-600 text-white border-green-600' })
  } else if (variant === 'warning') {
    toast({ title, className: 'bg-yellow-500 text-white border-yellow-500' })
  } else {
    toast({ title })
  }
}

// ─── Confirm hook ─────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'default' | 'destructive'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        resolve,
        confirmLabel: 'Confirm',
        confirmVariant: 'default',
        ...options,
      })
    })
  }, [])

  const handleClose = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  const ConfirmDialog = state ? (
    <AlertDialog
      open={state.open}
      onOpenChange={(open: boolean) => {
        if (!open) handleClose(false)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              state.confirmVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            onClick={() => handleClose(true)}
          >
            {state.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null

  return { confirm, ConfirmDialog }
}
