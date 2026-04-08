import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StockForm from '../../components/StockForm'
import ExpenseForm from '../../components/ExpenseForm'
import type { BranchCode } from '../../lib/supabase'

/**
 * Supervisor data entry page for stock levels and cash expenses.
 * Shows a branch selector first, then reuses StockForm and ExpenseForm
 * (the same components used by staff — no code duplication).
 * All entries are tagged with entered_by_role = "supervisor".
 */
export default function SupervisorEntry() {
  const [branch, setBranch] = useState<BranchCode | null>(null)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Data Entry</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Branch selector */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2 font-medium">Select branch</p>
        <div className="flex gap-3">
          <Button
            variant={branch === 'KR' ? 'default' : 'outline'}
            onClick={() => setBranch('KR')}
            className="flex-1 min-h-[48px]"
            data-testid="branch-kr"
          >
            Kaappi Ready
          </Button>
          <Button
            variant={branch === 'C2' ? 'default' : 'outline'}
            onClick={() => setBranch('C2')}
            className="flex-1 min-h-[48px]"
            data-testid="branch-c2"
          >
            Coffee Mate C2
          </Button>
        </div>
      </div>

      {/* Entry forms — shown after branch selection */}
      {branch && (
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="stock" className="flex-1">
              Stock Levels
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">
              Cash Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <StockForm branch={branch} date={today} enteredByRole="supervisor" />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseForm branch={branch} date={today} enteredByRole="supervisor" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
