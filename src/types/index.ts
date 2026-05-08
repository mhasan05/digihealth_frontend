export type Role = 'admin' | 'owner' | 'manager' | 'pathologist' | 'patient'

export type Portal = 'user' | 'admin' | 'owner' | 'manager' | 'pathologist'

const PORTAL_PRIORITY: Portal[] = ['admin', 'owner', 'manager', 'pathologist', 'user']

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
  type: 'General' | 'Specialized' | 'Clinic' | 'Diagnostic'
  status: 'Active' | 'Paused'
  address: string
  phone: string
  email: string
  beds: number
  established: string
  created_at: string
  updated_at: string
}

export interface Owner {
  id: string
  hospital_id: string
  name: string
  phone: string
  email: string
  is_primary: boolean
  status: 'Active' | 'Inactive'
  created_at: string
}

export interface Manager {
  id: string
  hospital_id: string
  name: string
  phone: string
  email: string
  password?: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
}

export interface Pathologist {
  id: string
  hospital_id: string
  name: string
  phone: string
  email: string
  password?: string
  specialization: string
  status: 'Active' | 'Inactive'
  created_at: string
}

export interface Doctor {
  id: string
  hospital_id: string
  name: string
  specialization: string
  phone: string
  schedule: string
  status: 'Active' | 'Inactive'
  created_at: string
}

export interface Nurse {
  id: string
  hospital_id: string
  name: string
  phone: string
  ward: string
  status: 'Active' | 'Inactive' | 'On-leave'
  created_at: string
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
  gender: 'Male' | 'Female' | 'Other'
  blood_group: string
  address: string
  subscription_tier: 'Free' | 'Premium'
  health_id: string
  created_at: string
}

export interface HealthMetric {
  id: string
  patient_id: string
  metric_type: 'hba1c' | 'blood_pressure' | 'weight'
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
  report_id: string
  report_name: string
  accessor_name: string
  accessor_role: Role
  action: 'viewed' | 'downloaded' | 'shared'
  timestamp: string
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'

export interface Appointment {
  id: string
  hospital_id: string
  patient_id: string
  patient_name: string
  doctor_id: string
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
  patient_name: string
  bed_id: string
  bed_number: string
  ward: string
  nurse_id: string
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
