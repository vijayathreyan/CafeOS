import React from 'react'
import ExpenseForm from '../../../components/ExpenseForm'
import type { BranchCode } from '../../../lib/supabase'

interface Props {
  branch: string
  entryDate: string
  onDone: (done: boolean) => void
}

export default function CashExpensesCard({ branch, entryDate, onDone }: Props) {
  return (
    <ExpenseForm
      branch={branch as BranchCode}
      date={entryDate}
      enteredByRole="staff"
      onDone={onDone}
      embedded
    />
  )
}
