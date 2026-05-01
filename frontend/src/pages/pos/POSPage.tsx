import React from 'react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { Monitor } from 'lucide-react'

export default function POSPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Point of Sale"
        subtitle="Billing system for Kaappi Ready and Coffee Mate C2"
      />
      <EmptyState
        icon={Monitor}
        title="POS Coming in Phase 12"
        description="The full billing system will be available in Phase 12. Stay tuned."
      />
    </PageContainer>
  )
}
