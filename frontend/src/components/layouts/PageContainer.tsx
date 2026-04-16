import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

/**
 * Wraps every page's content area with consistent padding, max-width, and spacing.
 * All pages should be wrapped in this component.
 */
export function PageContainer({
  children,
  className,
  ...rest
}: PageContainerProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('page-enter', className)}
      style={{
        padding: 'var(--content-padding)',
        maxWidth: 'var(--page-max-width)',
        margin: '0 auto',
        minHeight: 'calc(100vh - var(--header-height))',
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export default PageContainer
