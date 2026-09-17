export type Role = 'admin' | 'owner' | 'manager' | 'pathologist' | 'doctor' | 'patient'

export type Portal = 'user' | 'admin' | 'owner' | 'manager' | 'pathologist' | 'doctor'

const PORTAL_PRIORITY: Portal[] = ['admin', 'owner', 'manager', 'pathologist', 'doctor', 'user']

export function derivePortals(roles: Role[]): Portal[] {
  const set = new Set<Portal>(['user'])
  for (const r of roles) {
    if (r !== 'patient') set.add(r as Portal)
  }
  return PORTAL_PRIORITY.filter(p => set.has(p))
}

export const PORTAL_ROUTES: Record<Portal, string> = {
  admin: '/admin',
  owner: '/owner',
  manager: '/manager',
  pathologist: '/pathologist',
  doctor: '/doctor',
  user: '/patient',
}

export interface User {
  id: string
  phone: string
  email?: string
  health_id: string
  name: string
  roles: Role[]
  active_hospital_id?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

export interface Hospital {
  id: string
  name_bn: string
  name_en: string
  type: 'General' | 'Specialized' | 'Clinic' | 'Diagnostic' | 'Hospital'
  status: 'Active' | 'Paused'
  address: string
  phone: string
  email: string
  beds: number
  established: string
  created_at: string
  updated_at: string
}

export type Gender = 'Male' | 'Female' | 'Other'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Demographics {
  age?: number
  gender?: Gender
  blood_group?: BloodGroup | string
  address?: string
}

export interface Owner extends Demographics {
  id: string
  hospital_id: string
  name: string
  phone: string
  email: string
  is_primary: boolean
  status: 'Active' | 'Inactive'
  created_at: string
}

export interface Manager extends Demographics {
  id: string
  hospital_id: string
  name: string
  phone: string
  email: string
  password?: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
}

export interface Pathologist extends Demographics {
  id: string
  hospital_id: string | null
  name: string
  phone: string
  email: string
  password?: string
  specialization: string
  status: 'Active' | 'Inactive'
  created_at: string
}

/**
 * Doctor as seen from the owner / manager portals — a hospital attachment flattened
 * to keep existing UIs working. `id` is the attachment ID for owner CRUD; on the
 * manager pick list it's the registry Doctor ID (used as Appointment.doctor_id).
 *
 * `availability_status` is the global admin-controlled flag — when 'Unavailable'
 * the owner cannot set `status` to 'Active'.
 */
export interface Doctor {
  id: string
  hospital_id: string
  name: string
  phone: string
  bmdc_registration_no?: string | null
  availability_status?: 'Available' | 'Unavailable'
  specialization: string
  schedule: string
  status: 'Active' | 'Inactive'
  created_at: string
  doctor_id?: string
}

/** System-wide registry doctor — admin portal + owner registry search. */
export interface RegistryDoctor {
  id: string
  name: string
  phone: string
  bmdc_registration_no: string | null
  specialization: string
  availability_status?: 'Available' | 'Unavailable'
  created_at: string
  attached_hospital_count?: number
}

export interface Nurse {
  id: string
  hospital_id: string | null
  name: string
  phone: string
  ward: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
  active_admission_count?: number
}

/** Approved-but-unattached staff — hospital_id is null until an owner imports them. */
export interface MedicalAssistant {
  id: string
  hospital_id: string | null
  name: string
  phone: string
  ward: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
}

export interface Midwife {
  id: string
  hospital_id: string | null
  name: string
  phone: string
  ward: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
}

export type RoleApplicationType = 'doctor' | 'nurse' | 'medical_assistant' | 'midwife' | 'pathologist' | 'organization_owner'
export type RoleApplicationStatus = 'Pending' | 'Approved' | 'Rejected'
export type OrgType = 'Diagnostic' | 'Clinic' | 'Hospital'

/** `labelKey` resolves via t() at each call site — see roleApplicationType.* in en.json/bn.json. */
export const ROLE_APPLICATION_TYPES: { value: RoleApplicationType; labelKey: string }[] = [
  { value: 'doctor',              labelKey: 'roleApplicationType.doctor' },
  { value: 'nurse',                labelKey: 'roleApplicationType.nurse' },
  { value: 'medical_assistant',    labelKey: 'roleApplicationType.medicalAssistant' },
  { value: 'midwife',              labelKey: 'roleApplicationType.midwife' },
  { value: 'pathologist',          labelKey: 'roleApplicationType.pathologist' },
  { value: 'organization_owner',   labelKey: 'roleApplicationType.organizationOwner' },
]

/** A patient's self-service application for an additional role. */
export interface RoleApplication {
  id: string
  role_type: RoleApplicationType
  status: RoleApplicationStatus
  registration_number: string
  document_url: string
  facility_photo_url: string
  org_name: string
  org_type: OrgType | ''
  validity_till: string | null
  org_phone: string
  location_text: string
  upazilla: string
  district: string
  division: string
  post_code: string
  rejection_reason: string
  created_at: string
  reviewed_at: string | null
}

/** Admin-facing shape — includes applicant identity + reviewer name. */
export interface AdminRoleApplication extends RoleApplication {
  applicant_id: string
  applicant_name: string
  applicant_phone: string
  applicant_health_id: string
  reviewed_by_name: string
}

export interface Bed {
  id: string
  hospital_id: string
  number: string
  ward: string
  type: 'General' | 'ICU' | 'Private' | 'Cabin'
  price_per_day: number
  status: 'Available' | 'Occupied'
  created_at: string
}

export interface LabTest {
  id: string
  hospital_id: string
  name: string
  price: number
  duration: string
  available: boolean
  created_at: string
}

export interface Patient {
  id: string
  user_id: string
  name: string
  phone?: string
  age: number
  /** Source of truth for `age` on the patient's own profile edit — see settings-modal.tsx. */
  date_of_birth?: string | null
  gender: 'Male' | 'Female' | 'Other'
  blood_group: string
  address: string
  subscription_tier: 'Free' | 'Premium'
  health_id: string
  hiv_status?: 'Negative' | 'Positive'
  /** National ID number; self-reported and optional. */
  nid?: string
  /** When true, this patient is hidden from doctor search and detail endpoints. */
  is_private?: boolean
  /** Self-reported chronic conditions; see PATIENT_CONDITIONS for the catalogue. */
  conditions?: PatientCondition[]
  created_at: string
}

export type PatientCondition = 'asthma' | 'hypertension' | 'diabetes' | 'ckd'

/** `labelKey`/`shortKey` resolve via t() at each call site — see patientCondition.* in en.json/bn.json. */
export const PATIENT_CONDITIONS: { value: PatientCondition; labelKey: string; shortKey: string }[] = [
  { value: 'asthma',       labelKey: 'patientCondition.asthma',       shortKey: 'patientCondition.asthmaShort' },
  { value: 'hypertension', labelKey: 'patientCondition.hypertension', shortKey: 'patientCondition.hypertensionShort' },
  { value: 'diabetes',     labelKey: 'patientCondition.diabetes',     shortKey: 'patientCondition.diabetesShort' },
  { value: 'ckd',          labelKey: 'patientCondition.ckd',          shortKey: 'patientCondition.ckdShort' },
]

export interface HealthMetric {
  id: string
  patient_id: string
  metric_type: 'rbs' | 'blood_pressure' | 'weight'
  date: string
  value: string
}

export interface MedicalReport {
  id: string
  patient_id: string
  name: string
  file_url: string
  size: number
  uploaded_at: string
}

export interface ReportAccessLog {
  id: string
  patient_id: string
  /** Null for 'searched' (patient-level lookup), present for report-level actions. */
  report_id: string | null
  report_name: string
  accessor_name: string
  accessor_role: Role
  action: 'searched' | 'viewed' | 'downloaded' | 'shared'
  timestamp: string
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'

export interface Appointment {
  id: string
  hospital_id: string
  patient_id: string
  patient_name: string
  doctor_id: string | null
  doctor_name: string
  date: string
  time: string
  reason: string
  status: AppointmentStatus
  admitted: boolean
  created_at: string
}

export interface Admission {
  id: string
  appointment_id: string
  patient_id: string
  patient_name: string
  patient_phone?: string
  patient_age?: number
  patient_gender?: 'Male' | 'Female' | 'Other'
  blood_group?: string
  address?: string
  reason?: string
  doctor_id?: string | null
  doctor_name?: string
  bed_id: string
  bed_number: string
  ward: string
  nurse_id: string | null
  nurse_name: string
  admitted_at: string
  discharged_at?: string
  bed_price_snapshot: number
}

export type LabOrderStatus = 'Pending' | 'Assigned' | 'Completed' | 'Cancelled'

export interface LabOrder {
  id: string
  hospital_id: string
  patient_id: string
  patient_name: string
  test_id: string
  test_name: string
  ordered_by_doctor_name: string
  assigned_pathologist_id?: string
  assigned_pathologist_name?: string
  status: LabOrderStatus
  created_at: string
}

export interface LabResult {
  id: string
  lab_order_id: string
  findings: string
  remarks: 'Normal' | 'Abnormal' | 'Follow-up required'
  submitted_at: string
  submitted_by_name: string
}

export interface Subscription {
  id: string
  patient_id: string
  tier: 'Free' | 'Premium'
  started_at: string
  expires_at: string
  status: 'Active' | 'Expired'
}

export interface AdminDashboard {
  total_hospitals: number
  total_owners: number
  total_managers: number
  total_patients: number
  recent_activity: ActivityEvent[]
}

export interface ActivityEvent {
  id: string
  type: string
  description: string
  timestamp: string
}

export interface MonthlyFinancial {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface OwnerDashboard {
  managers_count: number
  pathologists_count: number
  doctors_count: number
  nurses_count: number
  beds_available: number
  beds_total: number
  active_tests: number
  current_revenue: number
  current_expenses: number
  current_profit: number
  revenue_trend: number
  profit_trend: number
  monthly_data: MonthlyFinancial[]
}

export interface ManagerDashboard {
  todays_appointments: number
  pending_confirmations: number
  currently_admitted: number
  pending_lab_orders: number
}

export interface PathologistDashboard {
  assigned_pending: number
  completed_today: number
  total_assigned: number
}
