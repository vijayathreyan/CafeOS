import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { BranchCode } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BranchSelect() {
  const { t } = useTranslation()
  const { user, setActiveBranch } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (branch: BranchCode) => {
    setActiveBranch(branch)
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{t('branch.select')}</CardTitle>
          <CardDescription>Welcome, {user.full_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.branch_access.map((branch) => (
            <Button
              key={branch}
              onClick={() => handleSelect(branch)}
              className="w-full text-lg py-6 h-auto"
            >
              {t(`branch.${branch}`)}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
