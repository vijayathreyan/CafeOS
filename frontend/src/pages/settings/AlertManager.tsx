import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Edit2, Send, ChevronDown, ChevronRight, Plus, X, FileSearch } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import { CardGridSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useAlertRules, useUpdateAlertRule, useSendTestAlert } from '@/hooks/useAlertRules'
import { useAlertLog } from '@/hooks/useAlertLog'
import type { AlertRule, AlertLog } from '@/types/phase10'
import { useToast } from '@/hooks/use-toast'

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function EditRuleDrawer({
  rule,
  open,
  onClose,
}: {
  rule: AlertRule
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState(rule.rule_name)
  const [desc, setDesc] = useState(rule.description ?? '')
  const [template, setTemplate] = useState(rule.message_template ?? '')
  const [active, setActive] = useState(rule.active)
  const [phones, setPhones] = useState<string[]>(rule.recipient_phones ?? [])
  const [newPhone, setNewPhone] = useState('')
  const update = useUpdateAlertRule()
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: rule.id,
        rule_name: name,
        description: desc,
        message_template: template,
        active,
        recipient_phones: phones,
      })
      toast({ title: 'Alert rule updated' })
      onClose()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    }
  }

  const addPhone = () => {
    const cleaned = newPhone.trim()
    if (cleaned && !phones.includes(cleaned)) {
      setPhones([...phones, cleaned])
      setNewPhone('')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        data-testid="edit-rule-drawer"
        style={{ width: 'min(480px, 95vw)', overflowY: 'auto', padding: '24px' }}
      >
        <SheetHeader>
          <SheetTitle style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
            Edit Alert Rule
          </SheetTitle>
        </SheetHeader>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rule name */}
          <div>
            <label style={labelStyle}>Rule Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Rule name"
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={inputStyle}
              placeholder="When does this fire?"
            />
          </div>

          {/* Recipients */}
          <div>
            <label style={labelStyle}>Recipient Phones</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {phones.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={p}
                    onChange={(e) => {
                      const arr = [...phones]
                      arr[i] = e.target.value
                      setPhones(arr)
                    }}
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                  <button
                    onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                    style={{
                      padding: '6px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="9XXXXXXXXX"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  onKeyDown={(e) => e.key === 'Enter' && addPhone()}
                  data-testid="new-phone-input"
                />
                <Button size="sm" variant="outline" onClick={addPhone}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Message template */}
          <div>
            <label style={labelStyle}>Message Template</label>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              placeholder="Message with {placeholders}"
            />
            <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
              Available: {'{branch}'} {'{amount}'} {'{date}'} {'{staff_name}'} {'{vendor_name}'}{' '}
              {'{item_name}'} {'{customer_name}'} {'{platform}'}
            </p>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={active} onCheckedChange={setActive} id="edit-active" />
            <label
              htmlFor="edit-active"
              style={{ fontSize: 14, color: 'var(--gray-700)', cursor: 'pointer' }}
            >
              Active
            </label>
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={update.isLoading} className="mt-2">
            {update.isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Alert rule card ──────────────────────────────────────────────────────────

function RuleCard({ rule }: { rule: AlertRule }) {
  const [editOpen, setEditOpen] = useState(false)
  const update = useUpdateAlertRule()
  const sendTest = useSendTestAlert()
  const { toast } = useToast()

  const handleToggle = async (checked: boolean) => {
    try {
      await update.mutateAsync({ id: rule.id, active: checked })
      toast({ title: checked ? 'Alert enabled' : 'Alert disabled' })
    } catch {
      toast({ title: 'Failed to update rule', variant: 'destructive' })
    }
  }

  const handleSendTest = async () => {
    try {
      const sent = await sendTest.mutateAsync(rule)
      toast({
        title: sent ? 'Test message sent' : 'Test queued (delivery pending)',
        description: `Rule: ${rule.rule_name}`,
      })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <div
        data-testid={`rule-card-${rule.trigger_event}`}
        style={{
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          background: 'white',
          marginBottom: 8,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--gray-900)',
                margin: 0,
              }}
            >
              {rule.rule_name}
            </p>
            {rule.description && (
              <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '2px 0 0' }}>
                {rule.description}
              </p>
            )}
          </div>
          <Switch
            checked={rule.active}
            onCheckedChange={handleToggle}
            disabled={update.isLoading}
            data-testid={`toggle-${rule.trigger_event}`}
          />
        </div>

        {/* Trigger chip */}
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--gray-100)',
              fontSize: 11,
              color: 'var(--gray-600)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {rule.trigger_event}
          </span>
        </div>

        {/* Recipients */}
        <div style={{ marginBottom: 10 }}>
          {rule.recipient_phones?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {rule.recipient_phones.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 11,
                    background: 'var(--brand-primary-subtle)',
                    color: 'var(--brand-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>
              No recipients configured
            </p>
          )}
        </div>

        {/* Message preview */}
        {rule.message_template && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--gray-600)',
              background: 'var(--gray-50)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 10,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {rule.message_template}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            data-testid={`edit-rule-${rule.trigger_event}`}
          >
            <Edit2 size={13} className="mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendTest}
            disabled={sendTest.isLoading || (rule.recipient_phones?.length ?? 0) === 0}
            data-testid={`test-rule-${rule.trigger_event}`}
          >
            <Send size={13} className="mr-1" />
            Send Test
          </Button>
        </div>
      </div>

      <EditRuleDrawer rule={rule} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}

// ─── Alert log section ────────────────────────────────────────────────────────

function AlertLogSection({ session }: { session: boolean }) {
  const [open, setOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const { data: logs = [], isLoading } = useAlertLog(
    session && open,
    fromDate || undefined,
    toDate || undefined
  )

  return (
    <SectionCard className="mt-4" data-testid="alert-log-section">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: '100%',
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--gray-900)',
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Recent Alert Log
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {/* Date filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From"
              style={inputStyle}
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To"
              style={inputStyle}
            />
          </div>

          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No alert log entries"
              description="Alerts will appear here once fired."
            />
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Date/Time', 'Trigger', 'Recipient', 'Message', 'Status'].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

function LogRow({ log }: { log: AlertLog }) {
  const [expanded, setExpanded] = useState(false)

  function statusBadge(s: string) {
    if (s === 'sent') return <StatusBadge status="success" label="Sent" size="sm" />
    if (s === 'failed') return <StatusBadge status="danger" label="Failed" size="sm" />
    return <StatusBadge status="warning" label="Pending" size="sm" />
  }

  return (
    <>
      <tr
        style={{
          borderBottom: 'var(--border-default)',
          cursor: log.error_message ? 'pointer' : 'default',
        }}
        onClick={() => log.error_message && setExpanded((v) => !v)}
      >
        <td style={tdStyle}>
          {new Date(log.created_at).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {log.trigger_event}
        </td>
        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{log.recipient_phone ?? '—'}</td>
        <td
          style={{
            ...tdStyle,
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {log.message_sent ?? '—'}
        </td>
        <td style={tdStyle}>{statusBadge(log.delivery_status ?? 'pending')}</td>
      </tr>
      {expanded && log.error_message && (
        <tr>
          <td
            colSpan={5}
            style={{
              padding: '8px 14px',
              background: 'var(--gray-50)',
              color: 'var(--color-danger)',
              fontSize: 12,
            }}
          >
            Error: {log.error_message}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--gray-600)',
  marginBottom: 4,
  fontFamily: 'var(--font-body)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: 'var(--border-default)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  color: 'var(--gray-800)',
  background: 'white',
  marginBottom: 0,
  boxSizing: 'border-box',
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--gray-600)',
  textTransform: 'uppercase',
  background: 'var(--gray-50)',
  borderBottom: 'var(--border-strong)',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--gray-800)',
  fontFamily: 'var(--font-body)',
  verticalAlign: 'middle',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlertManager() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: rules = [], isLoading } = useAlertRules(!!user)

  if (user?.role !== 'owner') {
    navigate('/dashboard')
    return null
  }

  return (
    <PageContainer data-testid="alert-manager-page">
      <PageHeader
        title="Alert Manager"
        subtitle="Configure WhatsApp alert rules and recipients"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              WhatsApp only · Whatomate
            </span>
          </div>
        }
      />

      <SectionCard title="Alert Rules" className="mb-4">
        {isLoading ? (
          <CardGridSkeleton />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alert rules"
            description="Run migration 016 to seed default rules."
          />
        ) : (
          <div data-testid="rules-list">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </SectionCard>

      <AlertLogSection session={!!user} />
    </PageContainer>
  )
}
