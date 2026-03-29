import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { supabaseAdmin } from '../../lib/supabase-admin'

const SECTIONS = ['systemAccess', 'personal', 'identity', 'emergency', 'work', 'bank'] as const
type Section = typeof SECTIONS[number]

interface FormData {
  // Section 1
  full_name: string
  phone: string
  role: 'staff' | 'supervisor' | 'owner'
  branch_kr: boolean
  branch_c2: boolean
  language_pref: string
  join_date: string
  employee_id: string
  // Bug 6: password fields for new employee
  password: string
  confirmPassword: string
  // Bug 6: reset password for edit
  reset_password: string
  reset_confirm_password: string
  // Section 2
  date_of_birth: string
  gender: string
  blood_group: string
  personal_email: string
  address_door: string
  address_street: string
  address_area: string
  address_city: string
  address_pincode: string
  address_state: string
  google_maps_url: string
  // Section 3 (handled separately via uploads)
  aadhaar_number: string
  college_name: string
  course: string
  study_year: string
  // Section 4
  emergency_name: string
  emergency_relationship: string
  emergency_phone: string
  // Section 5
  previous_experience: string
  reference_name: string
  reference_phone: string
  // Section 6
  bank_name: string
  account_number: string
  ifsc_code: string
  account_holder_name: string
  upi_id: string
}

export default function EmployeeOnboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [activeSection, setActiveSection] = useState<Section>('systemAccess')
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState('')

  // Bug 3: per-field inline errors for section 1 validation
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})

  // Bug 4A: duplicate phone check
  const [phoneError, setPhoneError] = useState('')
  const [phoneChecking, setPhoneChecking] = useState(false)

  // Bug 7: restore deleted employee prompt
  const [deletedEmployee, setDeletedEmployee] = useState<{ id: string; full_name: string } | null>(null)
  const [restoringDeletedId, setRestoringDeletedId] = useState<string | null>(null)

  // Bug 6: reset password UI toggle in edit mode
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetPwError, setResetPwError] = useState('')
  const [resetPwSaving, setResetPwSaving] = useState(false)

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      language_pref: 'en',
      branch_kr: false,
      branch_c2: false,
      role: 'staff',
    }
  })

  // Load existing employee for edit
  const { data: existing } = useQuery(
    ['employee', id],
    async () => {
      if (!id) return null
      const { data } = await supabase
        .from('employees')
        .select('*, employee_emergency_contacts(*), employee_bank_details(*), employee_identity(*)')
        .eq('id', id)
        .single()
      return data
    },
    { enabled: isEdit }
  )

  useEffect(() => {
    if (existing) {
      reset({
        full_name: existing.full_name,
        phone: existing.phone,
        role: existing.role,
        branch_kr: existing.branch_access?.includes('KR'),
        branch_c2: existing.branch_access?.includes('C2'),
        language_pref: existing.language_pref,
        join_date: existing.join_date,
        employee_id: existing.employee_id,
        date_of_birth: existing.date_of_birth,
        gender: existing.gender,
        blood_group: existing.blood_group,
        personal_email: existing.personal_email,
        address_door: existing.address_door,
        address_street: existing.address_street,
        address_area: existing.address_area,
        address_city: existing.address_city,
        address_pincode: existing.address_pincode,
        address_state: existing.address_state,
        google_maps_url: existing.google_maps_url,
        college_name: existing.employee_identity?.[0]?.college_name,
        course: existing.employee_identity?.[0]?.course,
        study_year: existing.employee_identity?.[0]?.study_year,
        emergency_name: existing.employee_emergency_contacts?.[0]?.contact_name,
        emergency_relationship: existing.employee_emergency_contacts?.[0]?.relationship,
        emergency_phone: existing.employee_emergency_contacts?.[0]?.phone,
        previous_experience: existing.previous_experience,
        reference_name: existing.reference_name,
        reference_phone: existing.reference_phone,
        bank_name: existing.employee_bank_details?.[0]?.bank_name,
        ifsc_code: existing.employee_bank_details?.[0]?.ifsc_code,
        account_holder_name: existing.employee_bank_details?.[0]?.account_holder_name,
        upi_id: existing.employee_bank_details?.[0]?.upi_id,
      })
    }
  }, [existing, reset])

  // Bug 4A + Bug 7: check for duplicate or deleted phone on blur
  const checkPhoneDuplicate = async (phone: string) => {
    if (isEdit || !phone) return
    setPhoneChecking(true)
    setPhoneError('')
    setDeletedEmployee(null)
    const clean = phone.replace(/\D/g, '')
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, deleted_at')
      .eq('phone', clean)
      .maybeSingle()
    setPhoneChecking(false)
    if (data) {
      if (data.deleted_at) {
        // Bug 7: phone belongs to a previously deleted employee — offer to restore
        setDeletedEmployee({ id: data.id, full_name: data.full_name })
      } else {
        setPhoneError('This phone number is already registered')
      }
    }
  }

  // Bug 7: load full deleted employee data and pre-fill form for restoration
  const handleRestoreDeleted = async () => {
    if (!deletedEmployee) return
    const { data } = await supabase
      .from('employees')
      .select('*, employee_emergency_contacts(*), employee_bank_details(*), employee_identity(*)')
      .eq('id', deletedEmployee.id)
      .single()
    if (data) {
      reset({
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        branch_kr: data.branch_access?.includes('KR'),
        branch_c2: data.branch_access?.includes('C2'),
        language_pref: data.language_pref,
        join_date: data.join_date,
        employee_id: data.employee_id,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        blood_group: data.blood_group,
        personal_email: data.personal_email,
        address_door: data.address_door,
        address_street: data.address_street,
        address_area: data.address_area,
        address_city: data.address_city,
        address_pincode: data.address_pincode,
        address_state: data.address_state,
        google_maps_url: data.google_maps_url,
        college_name: data.employee_identity?.[0]?.college_name,
        course: data.employee_identity?.[0]?.course,
        study_year: data.employee_identity?.[0]?.study_year,
        emergency_name: data.employee_emergency_contacts?.[0]?.contact_name,
        emergency_relationship: data.employee_emergency_contacts?.[0]?.relationship,
        emergency_phone: data.employee_emergency_contacts?.[0]?.phone,
        previous_experience: data.previous_experience,
        reference_name: data.reference_name,
        reference_phone: data.reference_phone,
        bank_name: data.employee_bank_details?.[0]?.bank_name,
        ifsc_code: data.employee_bank_details?.[0]?.ifsc_code,
        account_holder_name: data.employee_bank_details?.[0]?.account_holder_name,
        upi_id: data.employee_bank_details?.[0]?.upi_id,
      })
      setRestoringDeletedId(data.id)
    }
    setDeletedEmployee(null)
  }

  // Bug 3: validate mandatory fields in Section 1 before proceeding
  const validateSection1 = (): boolean => {
    const v = watch()
    const errs: Record<string, string> = {}
    if (!v.full_name?.trim()) errs.full_name = 'Full name is required'
    if (!v.phone?.trim()) errs.phone = 'Phone number is required'
    if (!v.role) errs.role = 'Role is required'
    if (!v.branch_kr && !v.branch_c2) errs.branch = 'Select at least one branch'
    // Bug 6: password required for new employees
    if (!isEdit && !restoringDeletedId) {
      if (!v.password?.trim()) errs.password = 'Password is required'
      else if (v.password.length < 6) errs.password = 'Minimum 6 characters'
      if (!v.confirmPassword?.trim()) errs.confirmPassword = 'Please confirm the password'
      else if (v.password !== v.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    }
    setSectionErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Bug 3: clear a single field error when user starts typing
  const clearSectionError = (field: string) => {
    if (sectionErrors[field]) setSectionErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  // Bug 5: per-section save handler (edit mode)
  const handleSaveSection = async () => {
    if (!id) return
    setSaving(true)
    const v = watch()
    try {
      if (activeSection === 'systemAccess') {
        const branch_access = [v.branch_kr && 'KR', v.branch_c2 && 'C2'].filter(Boolean) as string[]
        if (branch_access.length === 0) { setToast('Select at least one branch'); setSaving(false); return }
        const { error } = await supabase.from('employees').update({
          full_name: v.full_name, phone: v.phone, role: v.role,
          branch_access, language_pref: v.language_pref,
          join_date: v.join_date || null, employee_id: v.employee_id || undefined,
        }).eq('id', id)
        if (error) throw error

      } else if (activeSection === 'personal') {
        const { error } = await supabase.from('employees').update({
          date_of_birth: v.date_of_birth || null, gender: v.gender || null,
          blood_group: v.blood_group || null, personal_email: v.personal_email || null,
          address_door: v.address_door || null, address_street: v.address_street || null,
          address_area: v.address_area || null, address_city: v.address_city || null,
          address_pincode: v.address_pincode || null, address_state: v.address_state || null,
          google_maps_url: v.google_maps_url || null,
        }).eq('id', id)
        if (error) throw error

      } else if (activeSection === 'identity') {
        const { error } = await supabase.from('employee_identity').upsert({
          employee_id: id, college_name: v.college_name || null,
          course: v.course || null, study_year: v.study_year || null,
        }, { onConflict: 'employee_id' })
        if (error) throw error

      } else if (activeSection === 'emergency') {
        if (v.emergency_name) {
          const { error } = await supabase.from('employee_emergency_contacts').upsert({
            employee_id: id, contact_name: v.emergency_name,
            relationship: v.emergency_relationship || null, phone: v.emergency_phone,
          }, { onConflict: 'employee_id' })
          if (error) throw error
        }

      } else if (activeSection === 'work') {
        const { error } = await supabase.from('employees').update({
          previous_experience: v.previous_experience || null,
          reference_name: v.reference_name || null,
          reference_phone: v.reference_phone || null,
        }).eq('id', id)
        if (error) throw error

      } else if (activeSection === 'bank') {
        if (v.bank_name || v.ifsc_code) {
          const { error } = await supabase.from('employee_bank_details').upsert({
            employee_id: id, bank_name: v.bank_name || null,
            ifsc_code: v.ifsc_code || null, account_holder_name: v.account_holder_name || null,
            upi_id: v.upi_id || null,
          }, { onConflict: 'employee_id' })
          if (error) throw error
        }
      }
      setToast('Saved successfully')
    } catch (e: any) {
      setToast('Error: ' + (e.message || 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  // Bug 6: reset password for an existing employee via admin API
  const handleResetPassword = async () => {
    if (!existing?.auth_user_id) { setResetPwError('No auth account linked to this employee'); return }
    if (!supabaseAdmin) { setResetPwError('Admin API not configured (SERVICE_ROLE_KEY missing)'); return }
    const v = watch()
    if (!v.reset_password || v.reset_password.length < 6) { setResetPwError('Minimum 6 characters'); return }
    if (v.reset_password !== v.reset_confirm_password) { setResetPwError('Passwords do not match'); return }
    setResetPwSaving(true)
    setResetPwError('')
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.auth_user_id, { password: v.reset_password })
    setResetPwSaving(false)
    if (error) { setResetPwError(error.message); return }
    setValue('reset_password', '')
    setValue('reset_confirm_password', '')
    setShowResetPassword(false)
    setToast('Password reset successfully')
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError('')
    try {
      const branch_access: string[] = []
      if (data.branch_kr) branch_access.push('KR')
      if (data.branch_c2) branch_access.push('C2')
      if (branch_access.length === 0) { setError('Select at least one branch'); setSubmitting(false); return }

      // ── Bug 7: Restore deleted employee ──
      if (restoringDeletedId) {
        const { error: err } = await supabase.from('employees').update({
          full_name: data.full_name, phone: data.phone, role: data.role,
          branch_access, language_pref: data.language_pref,
          join_date: data.join_date || null,
          date_of_birth: data.date_of_birth || null, gender: data.gender || null,
          blood_group: data.blood_group || null, personal_email: data.personal_email || null,
          address_door: data.address_door || null, address_street: data.address_street || null,
          address_area: data.address_area || null, address_city: data.address_city || null,
          address_pincode: data.address_pincode || null, address_state: data.address_state || null,
          google_maps_url: data.google_maps_url || null,
          previous_experience: data.previous_experience || null,
          reference_name: data.reference_name || null, reference_phone: data.reference_phone || null,
          active: true, deleted_at: null,
        }).eq('id', restoringDeletedId)
        if (err) throw err
        setSuccess(true)
        setTimeout(() => navigate('/users'), 1500)
        return
      }

      // ── Edit existing employee ──
      if (isEdit && id) {
        const { error: err } = await supabase.from('employees').update({
          full_name: data.full_name, phone: data.phone, role: data.role,
          branch_access, language_pref: data.language_pref,
          join_date: data.join_date || null,
          employee_id: data.employee_id || undefined,
          date_of_birth: data.date_of_birth || null, gender: data.gender || null,
          blood_group: data.blood_group || null, personal_email: data.personal_email || null,
          address_door: data.address_door || null, address_street: data.address_street || null,
          address_area: data.address_area || null, address_city: data.address_city || null,
          address_pincode: data.address_pincode || null, address_state: data.address_state || null,
          google_maps_url: data.google_maps_url || null,
          previous_experience: data.previous_experience || null,
          reference_name: data.reference_name || null, reference_phone: data.reference_phone || null,
        }).eq('id', id)
        if (err) throw err
        if (data.emergency_name) {
          await supabase.from('employee_emergency_contacts').upsert({
            employee_id: id, contact_name: data.emergency_name,
            relationship: data.emergency_relationship, phone: data.emergency_phone,
          }, { onConflict: 'employee_id' })
        }
        if (data.bank_name || data.ifsc_code) {
          await supabase.from('employee_bank_details').upsert({
            employee_id: id, bank_name: data.bank_name || null, ifsc_code: data.ifsc_code || null,
            account_holder_name: data.account_holder_name || null, upi_id: data.upi_id || null,
          }, { onConflict: 'employee_id' })
        }
        setSuccess(true)
        setTimeout(() => navigate('/users'), 1500)
        return
      }

      // ── Create new employee ──

      // Bug 6: validate passwords
      if (!data.password || data.password.length < 6) {
        setError('Password must be at least 6 characters')
        setSubmitting(false)
        return
      }
      if (data.password !== data.confirmPassword) {
        setError('Passwords do not match')
        setSubmitting(false)
        return
      }

      // Bug 6: create auth user first via admin API
      if (!supabaseAdmin) {
        setError('Admin API not configured. Add SERVICE_ROLE_KEY to .env and rebuild.')
        setSubmitting(false)
        return
      }
      const email = `${data.phone.replace(/\D/g, '')}@cafeos.local`
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
      })
      if (authErr) throw new Error('Auth creation failed: ' + authErr.message)
      const authUserId = authData.user.id

      // Insert employee record — Bug 4B: rollback auth user if employee insert fails
      const { data: emp, error: empErr } = await supabase.from('employees').insert({
        full_name: data.full_name, phone: data.phone, role: data.role,
        branch_access, language_pref: data.language_pref,
        join_date: data.join_date || null,
        employee_id: data.employee_id || undefined,
        auth_user_id: authUserId,
        date_of_birth: data.date_of_birth || null, gender: data.gender || null,
        blood_group: data.blood_group || null, personal_email: data.personal_email || null,
        address_door: data.address_door || null, address_street: data.address_street || null,
        address_area: data.address_area || null, address_city: data.address_city || null,
        address_pincode: data.address_pincode || null, address_state: data.address_state || null,
        google_maps_url: data.google_maps_url || null,
        previous_experience: data.previous_experience || null,
        reference_name: data.reference_name || null, reference_phone: data.reference_phone || null,
      }).select().single()

      if (empErr) {
        // Rollback: delete the auth user so no orphan is left
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        throw empErr
      }

      const empId = emp.id
      // Insert related tables — rollback employee + auth user on failure
      try {
        if (data.emergency_name) {
          const { error: emErr } = await supabase.from('employee_emergency_contacts').insert({
            employee_id: empId, contact_name: data.emergency_name,
            relationship: data.emergency_relationship, phone: data.emergency_phone,
          })
          if (emErr) throw emErr
        }
        if (data.college_name || data.aadhaar_number) {
          const { error: idErr } = await supabase.from('employee_identity').insert({
            employee_id: empId, college_name: data.college_name || null,
            course: data.course || null, study_year: data.study_year || null,
          })
          if (idErr) throw idErr
        }
        if (data.bank_name || data.ifsc_code) {
          const { error: bankErr } = await supabase.from('employee_bank_details').insert({
            employee_id: empId, bank_name: data.bank_name || null,
            ifsc_code: data.ifsc_code || null, account_holder_name: data.account_holder_name || null,
            upi_id: data.upi_id || null,
          })
          if (bankErr) throw bankErr
        }
      } catch (relErr: any) {
        // Rollback: delete employee and auth user
        await supabase.from('employees').delete().eq('id', empId)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        throw relErr
      }

      setSuccess(true)
      setTimeout(() => navigate('/users'), 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to save employee')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="card p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {restoringDeletedId ? 'Employee Restored' : isEdit ? 'Employee Updated' : 'Employee Created'}
          </h2>
          <p className="text-text-secondary text-sm">Redirecting...</p>
        </div>
      </div>
    )
  }

  const sectionTitle = (s: Section) => t(`employees.sections.${s}`)
  const sectionIndex = SECTIONS.indexOf(activeSection)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Bug 5: toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white text-sm font-medium ${toast.startsWith('Error') ? 'bg-error' : 'bg-secondary'}`}>
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users')} className="text-text-secondary hover:text-text-primary">
          ← {t('common.back')}
        </button>
        <h1 className="section-header">
          {restoringDeletedId ? 'Restore Employee' : isEdit ? t('employees.edit') : t('employees.add')}
        </h1>
      </div>

      {/* Bug 7: restore prompt */}
      {deletedEmployee && (
        <div className="card p-4 mb-4 border-warning bg-yellow-50">
          <p className="text-sm font-medium text-text-primary mb-2">
            A deleted record exists for this phone number: <strong>{deletedEmployee.full_name}</strong>
          </p>
          <p className="text-xs text-text-secondary mb-3">Would you like to restore their details and update what has changed?</p>
          <div className="flex gap-2">
            <button onClick={handleRestoreDeleted} className="btn-primary text-sm px-3 py-1.5">Yes, Restore Details</button>
            <button onClick={() => setDeletedEmployee(null)} className="btn-secondary text-sm px-3 py-1.5">No, Enter Fresh</button>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSection === s ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {i + 1}. {sectionTitle(s)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Section 1 — System Access ── */}
        {activeSection === 'systemAccess' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">1. {t('employees.sections.systemAccess')}</h2>

            <div>
              <label className="input-label">{t('employees.fields.fullName')} *</label>
              <input className="input-field" {...register('full_name')}
                onChange={e => { register('full_name').onChange(e); clearSectionError('full_name') }} />
              {sectionErrors.full_name && <p className="text-error text-xs mt-1">{sectionErrors.full_name}</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.phone')} *</label>
              <input className="input-field" type="tel" placeholder="9876543210"
                {...register('phone')}
                onChange={e => { register('phone').onChange(e); clearSectionError('phone'); setPhoneError('') }}
                onBlur={e => checkPhoneDuplicate(e.target.value)}
              />
              {sectionErrors.phone && <p className="text-error text-xs mt-1">{sectionErrors.phone}</p>}
              {phoneChecking && <p className="text-text-secondary text-xs mt-1">Checking...</p>}
              {phoneError && <p className="text-error text-xs mt-1">{phoneError}</p>}
              {isEdit && <p className="text-yellow-600 text-xs mt-1">Changing phone number will update the login username</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.role')} *</label>
              <select className="input-field" {...register('role')}
                onChange={e => { register('role').onChange(e); clearSectionError('role') }}>
                <option value="staff">{t('employees.roles.staff')}</option>
                <option value="supervisor">{t('employees.roles.supervisor')}</option>
                <option value="owner">{t('employees.roles.owner')}</option>
              </select>
              {sectionErrors.role && <p className="text-error text-xs mt-1">{sectionErrors.role}</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.branchAccess')} *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-tap">
                  <input type="checkbox" className="w-5 h-5" {...register('branch_kr')}
                    onChange={e => { register('branch_kr').onChange(e); clearSectionError('branch') }} />
                  <span className="text-sm font-medium">{t('branch.KR')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-tap">
                  <input type="checkbox" className="w-5 h-5" {...register('branch_c2')}
                    onChange={e => { register('branch_c2').onChange(e); clearSectionError('branch') }} />
                  <span className="text-sm font-medium">{t('branch.C2')}</span>
                </label>
              </div>
              {sectionErrors.branch && <p className="text-error text-xs mt-1">{sectionErrors.branch}</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.langPref')}</label>
              <select className="input-field" {...register('language_pref')}>
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.joinDate')}</label>
                <input className="input-field" type="date" {...register('join_date')} />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.employeeId')}</label>
                <input className="input-field" placeholder="Auto-generated" {...register('employee_id')} />
              </div>
            </div>

            {/* Bug 6: password fields — only for new employee */}
            {!isEdit && !restoringDeletedId && (
              <>
                <hr className="border-border" />
                <h3 className="font-medium text-text-primary text-sm">Set Login Password</h3>
                <div>
                  <label className="input-label">Password * <span className="text-text-secondary font-normal">(min. 6 characters)</span></label>
                  <input className="input-field" type="password"
                    {...register('password')}
                    onChange={e => { register('password').onChange(e); clearSectionError('password') }}
                  />
                  {sectionErrors.password && <p className="text-error text-xs mt-1">{sectionErrors.password}</p>}
                </div>
                <div>
                  <label className="input-label">Confirm Password *</label>
                  <input className="input-field" type="password"
                    {...register('confirmPassword')}
                    onChange={e => { register('confirmPassword').onChange(e); clearSectionError('confirmPassword') }}
                  />
                  {sectionErrors.confirmPassword && <p className="text-error text-xs mt-1">{sectionErrors.confirmPassword}</p>}
                </div>
              </>
            )}

            {/* Bug 6: reset password — only in edit mode */}
            {isEdit && (
              <>
                <hr className="border-border" />
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-text-primary text-sm">Reset Password</h3>
                  <button type="button" onClick={() => setShowResetPassword(v => !v)}
                    className="text-xs text-primary hover:underline">
                    {showResetPassword ? 'Cancel' : 'Change Password'}
                  </button>
                </div>
                {showResetPassword && (
                  <div className="space-y-3">
                    <div>
                      <label className="input-label">New Password * <span className="text-text-secondary font-normal">(min. 6 characters)</span></label>
                      <input className="input-field" type="password" {...register('reset_password')} />
                    </div>
                    <div>
                      <label className="input-label">Confirm New Password *</label>
                      <input className="input-field" type="password" {...register('reset_confirm_password')} />
                    </div>
                    {resetPwError && <p className="text-error text-xs">{resetPwError}</p>}
                    <button type="button" onClick={handleResetPassword} disabled={resetPwSaving}
                      className="btn-primary text-sm px-4 py-2">
                      {resetPwSaving ? 'Saving...' : 'Set New Password'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Section 2 — Personal Details ── */}
        {activeSection === 'personal' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">2. {t('employees.sections.personal')}</h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.dob')}</label>
                <input className="input-field" type="date" {...register('date_of_birth')} />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.gender')}</label>
                <select className="input-field" {...register('gender')}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="input-label">{t('employees.fields.bloodGroup')}</label>
                <input className="input-field" placeholder="A+" {...register('blood_group')} />
              </div>
            </div>

            <div>
              <label className="input-label">{t('employees.fields.email')} ({t('common.optional')})</label>
              <input className="input-field" type="email" {...register('personal_email')} />
            </div>

            <div className="space-y-3">
              <label className="input-label">{t('employees.fields.address')}</label>
              <input className="input-field" placeholder="Door No" {...register('address_door')} />
              <input className="input-field" placeholder="Street" {...register('address_street')} />
              <input className="input-field" placeholder="Area / Locality" {...register('address_area')} />
              <div className="grid grid-cols-3 gap-3">
                <input className="input-field" placeholder="City" {...register('address_city')} />
                <input className="input-field" placeholder="Pincode" {...register('address_pincode')} />
                <input className="input-field" placeholder="State" {...register('address_state')} />
              </div>
            </div>

            <div>
              <label className="input-label">{t('employees.fields.mapsUrl')} ({t('common.optional')})</label>
              <input className="input-field" placeholder="https://maps.app.goo.gl/..." {...register('google_maps_url')} />
            </div>
          </div>
        )}

        {/* ── Section 3 — Identity Documents ── */}
        {activeSection === 'identity' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">3. {t('employees.sections.identity')}</h2>
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-primary">
              Aadhaar number is stored encrypted. Document photos are stored in private storage.
            </div>

            <div>
              <label className="input-label">{t('employees.fields.aadhaar')}</label>
              <input className="input-field" type="password" placeholder="XXXX XXXX XXXX" {...register('aadhaar_number')} />
              <p className="text-xs text-text-secondary mt-1">Stored encrypted — never shown after saving</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.aadhaarFront')}</label>
                <input type="file" accept="image/*" className="input-field" />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.aadhaarBack')}</label>
                <input type="file" accept="image/*" className="input-field" />
              </div>
            </div>

            <hr className="border-border" />
            <h3 className="font-medium text-text-primary">College Details ({t('common.optional')})</h3>
            <div>
              <label className="input-label">{t('employees.fields.collegeId')}</label>
              <input type="file" accept="image/*" className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.collegeName')}</label>
                <input className="input-field" {...register('college_name')} />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.course')}</label>
                <input className="input-field" {...register('course')} />
              </div>
            </div>
            <div>
              <label className="input-label">{t('employees.fields.studyYear')}</label>
              <input className="input-field" placeholder="2nd Year" {...register('study_year')} />
            </div>
          </div>
        )}

        {/* ── Section 4 — Emergency Contact ── */}
        {activeSection === 'emergency' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">4. {t('employees.sections.emergency')}</h2>

            <div>
              <label className="input-label">{t('employees.fields.emergencyName')}</label>
              <input className="input-field" {...register('emergency_name')} />
            </div>
            <div>
              <label className="input-label">{t('employees.fields.relationship')}</label>
              <select className="input-field" {...register('emergency_relationship')}>
                <option value="">Select</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="input-label">{t('employees.fields.emergencyPhone')}</label>
              <input className="input-field" type="tel" {...register('emergency_phone')} />
            </div>
          </div>
        )}

        {/* ── Section 5 — Work Background ── */}
        {activeSection === 'work' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">5. {t('employees.sections.work')}</h2>

            <div>
              <label className="input-label">{t('employees.fields.experience')} ({t('common.optional')})</label>
              <textarea className="input-field h-32 resize-none" placeholder="Previous work experience summary..." {...register('previous_experience')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.refName')} ({t('common.optional')})</label>
                <input className="input-field" {...register('reference_name')} />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.refPhone')} ({t('common.optional')})</label>
                <input className="input-field" type="tel" {...register('reference_phone')} />
              </div>
            </div>
          </div>
        )}

        {/* ── Section 6 — Bank Details ── */}
        {activeSection === 'bank' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">6. {t('employees.sections.bank')}</h2>
            <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
              Bank details collected now — used in Phase 13 Payroll. Account number stored encrypted.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t('employees.fields.bankName')}</label>
                <input className="input-field" placeholder="SBI" {...register('bank_name')} />
              </div>
              <div>
                <label className="input-label">{t('employees.fields.ifsc')}</label>
                <input className="input-field" placeholder="SBIN0001234" {...register('ifsc_code')} />
              </div>
            </div>
            <div>
              <label className="input-label">{t('employees.fields.accountNumber')}</label>
              <input className="input-field" type="password" placeholder="Account number" {...register('account_number')} />
              <p className="text-xs text-text-secondary mt-1">Stored encrypted</p>
            </div>
            <div>
              <label className="input-label">{t('employees.fields.accountHolder')}</label>
              <input className="input-field" {...register('account_holder_name')} />
            </div>
            <div>
              <label className="input-label">{t('employees.fields.upiId')} ({t('common.optional')})</label>
              <input className="input-field" placeholder="name@upi" {...register('upi_id')} />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && <div className="mt-4 p-3 bg-red-50 rounded-lg text-error text-sm">{error}</div>}

        {/* Navigation + Submit */}
        <div className="flex justify-between mt-6 gap-3 flex-wrap">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => sectionIndex > 0 && setActiveSection(SECTIONS[sectionIndex - 1])}
            disabled={sectionIndex === 0}
          >
            ← {t('common.back')}
          </button>

          <div className="flex gap-3">
            {/* Bug 5: Save Changes button — edit mode only, saves current section immediately */}
            {isEdit && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveSection}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {sectionIndex < SECTIONS.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={!!phoneError}
                onClick={() => {
                  // Bug 3: validate section 1 before proceeding
                  if (activeSection === 'systemAccess' && !validateSection1()) return
                  setActiveSection(SECTIONS[sectionIndex + 1])
                }}
              >
                {t('common.next')} →
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? t('common.loading') : t('common.submit')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
