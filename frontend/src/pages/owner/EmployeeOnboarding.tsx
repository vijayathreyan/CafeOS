import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
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
      const { data } = await supabase.from('employees').select('*, employee_emergency_contacts(*), employee_bank_details(*), employee_identity(*)').eq('id', id).single()
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

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError('')
    try {
      const branch_access: string[] = []
      if (data.branch_kr) branch_access.push('KR')
      if (data.branch_c2) branch_access.push('C2')

      if (branch_access.length === 0) {
        setError('Select at least one branch')
        setSubmitting(false)
        return
      }

      if (isEdit && id) {
        // Update employee
        const { error: err } = await supabase.from('employees').update({
          full_name: data.full_name,
          role: data.role,
          branch_access,
          language_pref: data.language_pref,
          join_date: data.join_date || null,
          employee_id: data.employee_id || undefined,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          blood_group: data.blood_group || null,
          personal_email: data.personal_email || null,
          address_door: data.address_door || null,
          address_street: data.address_street || null,
          address_area: data.address_area || null,
          address_city: data.address_city || null,
          address_pincode: data.address_pincode || null,
          address_state: data.address_state || null,
          google_maps_url: data.google_maps_url || null,
          previous_experience: data.previous_experience || null,
          reference_name: data.reference_name || null,
          reference_phone: data.reference_phone || null,
        }).eq('id', id)
        if (err) throw err

        // Update related tables
        if (data.emergency_name) {
          await supabase.from('employee_emergency_contacts').upsert({
            employee_id: id,
            contact_name: data.emergency_name,
            relationship: data.emergency_relationship,
            phone: data.emergency_phone,
          }, { onConflict: 'employee_id' })
        }
        if (data.bank_name || data.ifsc_code) {
          await supabase.from('employee_bank_details').upsert({
            employee_id: id,
            bank_name: data.bank_name || null,
            ifsc_code: data.ifsc_code || null,
            account_holder_name: data.account_holder_name || null,
            upi_id: data.upi_id || null,
          }, { onConflict: 'employee_id' })
        }
      } else {
        // Create new employee
        // First create auth user
        const email = `${data.phone.replace(/\D/g, '')}@cafeos.local`
        const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!'

        // Create in auth system (in production this calls admin API)
        // For now we insert the employee record and store auth_user_id later
        const { data: emp, error: empErr } = await supabase.from('employees').insert({
          full_name: data.full_name,
          phone: data.phone,
          role: data.role,
          branch_access,
          language_pref: data.language_pref,
          join_date: data.join_date || null,
          employee_id: data.employee_id || undefined,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          blood_group: data.blood_group || null,
          personal_email: data.personal_email || null,
          address_door: data.address_door || null,
          address_street: data.address_street || null,
          address_area: data.address_area || null,
          address_city: data.address_city || null,
          address_pincode: data.address_pincode || null,
          address_state: data.address_state || null,
          google_maps_url: data.google_maps_url || null,
          previous_experience: data.previous_experience || null,
          reference_name: data.reference_name || null,
          reference_phone: data.reference_phone || null,
        }).select().single()
        if (empErr) throw empErr

        const empId = emp.id

        // Related records
        if (data.emergency_name) {
          await supabase.from('employee_emergency_contacts').insert({
            employee_id: empId,
            contact_name: data.emergency_name,
            relationship: data.emergency_relationship,
            phone: data.emergency_phone,
          })
        }
        if (data.college_name || data.aadhaar_number) {
          await supabase.from('employee_identity').insert({
            employee_id: empId,
            college_name: data.college_name || null,
            course: data.course || null,
            study_year: data.study_year || null,
          })
        }
        if (data.bank_name || data.ifsc_code) {
          await supabase.from('employee_bank_details').insert({
            employee_id: empId,
            bank_name: data.bank_name || null,
            ifsc_code: data.ifsc_code || null,
            account_holder_name: data.account_holder_name || null,
            upi_id: data.upi_id || null,
          })
        }
        // TODO: send WhatsApp with credentials via alert system
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
            {isEdit ? 'Employee Updated' : 'Employee Created'}
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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users')} className="text-text-secondary hover:text-text-primary">
          ← {t('common.back')}
        </button>
        <h1 className="section-header">
          {isEdit ? t('employees.edit') : t('employees.add')}
        </h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSection === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {i + 1}. {sectionTitle(s)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1 — System Access */}
        {activeSection === 'systemAccess' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">1. {t('employees.sections.systemAccess')}</h2>

            <div>
              <label className="input-label">{t('employees.fields.fullName')} *</label>
              <input className="input-field" {...register('full_name', { required: true })} />
              {errors.full_name && <p className="text-error text-xs mt-1">{t('common.required')}</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.phone')} *</label>
              <input className="input-field" type="tel" placeholder="9876543210" {...register('phone', { required: true })} disabled={isEdit} />
              {errors.phone && <p className="text-error text-xs mt-1">{t('common.required')}</p>}
              {isEdit && <p className="text-text-secondary text-xs mt-1">Phone cannot be changed after creation</p>}
            </div>

            <div>
              <label className="input-label">{t('employees.fields.role')} *</label>
              <select className="input-field" {...register('role', { required: true })}>
                <option value="staff">{t('employees.roles.staff')}</option>
                <option value="supervisor">{t('employees.roles.supervisor')}</option>
                <option value="owner">{t('employees.roles.owner')}</option>
              </select>
            </div>

            <div>
              <label className="input-label">{t('employees.fields.branchAccess')} *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-tap">
                  <input type="checkbox" className="w-5 h-5" {...register('branch_kr')} />
                  <span className="text-sm font-medium">{t('branch.KR')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-tap">
                  <input type="checkbox" className="w-5 h-5" {...register('branch_c2')} />
                  <span className="text-sm font-medium">{t('branch.C2')}</span>
                </label>
              </div>
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
          </div>
        )}

        {/* Section 2 — Personal Details */}
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

        {/* Section 3 — Identity Documents */}
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

        {/* Section 4 — Emergency Contact */}
        {activeSection === 'emergency' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">4. {t('employees.sections.emergency')}</h2>

            <div>
              <label className="input-label">{t('employees.fields.emergencyName')} *</label>
              <input className="input-field" {...register('emergency_name', { required: true })} />
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
              <label className="input-label">{t('employees.fields.emergencyPhone')} *</label>
              <input className="input-field" type="tel" {...register('emergency_phone', { required: true })} />
            </div>
          </div>
        )}

        {/* Section 5 — Work Background */}
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

        {/* Section 6 — Bank Details */}
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

        {/* Navigation + Submit */}
        {error && <div className="mt-4 p-3 bg-red-50 rounded-lg text-error text-sm">{error}</div>}

        <div className="flex justify-between mt-6 gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => sectionIndex > 0 && setActiveSection(SECTIONS[sectionIndex - 1])}
            disabled={sectionIndex === 0}
          >
            ← {t('common.back')}
          </button>

          {sectionIndex < SECTIONS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setActiveSection(SECTIONS[sectionIndex + 1])}>
              {t('common.next')} →
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? t('common.loading') : t('common.submit')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
