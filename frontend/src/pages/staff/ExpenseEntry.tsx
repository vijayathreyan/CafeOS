import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ExpenseForm from '../../components/ExpenseForm'
import type { BranchCode } from '../../lib/supabase'

/**
 * Cash Expenses Entry page for staff.
 * Branch is automatically resolved from the authenticated user's active branch.
 */
export default function ExpenseEntry() {
  const { user, activeBranch } = useAuth()
  const branch = (activeBranch || user?.branch_access[0]) as BranchCode | undefined
  const today = new Date().toISOString().split('T')[0]

  if (!branch) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No branch assigned. Please contact your manager.
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Cash Expenses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>
      <ExpenseForm branch={branch} date={today} enteredByRole="staff" />
    </div>
  )
}
