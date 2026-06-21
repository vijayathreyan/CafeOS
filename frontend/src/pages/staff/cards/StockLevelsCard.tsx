import React from 'react'
import StockForm from '../../../components/StockForm'
import type { BranchCode } from '../../../lib/supabase'

interface Props {
  branch: string
  entryDate: string
  onDone: (done: boolean) => void
}

export default function StockLevelsCard({ branch, entryDate, onDone }: Props) {
  return (
    <StockForm
      branch={branch as BranchCode}
      date={entryDate}
      enteredByRole="staff"
      onDone={onDone}
      embedded
    />
  )
}
