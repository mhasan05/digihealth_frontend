import type {
  User, Hospital, Owner, Manager, Pathologist, Doctor, Nurse,
  Bed, LabTest, Patient, HealthMetric, MedicalReport, ReportAccessLog,
  Appointment, Admission, LabOrder, LabResult,
  AdminDashboard, OwnerDashboard, ManagerDashboard, PathologistDashboard,
  AppointmentStatus, LabOrderStatus,
} from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // Import dynamically to avoid circular dependency with the store
  const { useAuthStore } = await import('@/store/auth-store')
  const token = useAuthStore.getState().accessToken

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  })

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as T

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.detail ?? body.message ?? 'Request failed')
  }
  return body as T
}

const get  = <T>(path: string)                  => req<T>(path)
const post = <T>(path: string, data?: unknown)  => req<T>(path, { method: 'POST',   body: data ? JSON.stringify(data) : undefined })
const put  = <T>(path: string, data?: unknown)  => req<T>(path, { method: 'PUT',    body: data ? JSON.stringify(data) : undefined })
const del  = <T>(path: string)                  => req<T>(path, { method: 'DELETE' })

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login: (credentials: { identifier: string; password: string; method: 'phone' | 'health_id' }) =>
      post<{ user: User; token: string }>('/api/auth/login/', credentials),

    loginAsRole: (role: string) =>
      post<{ user: User; token: string }>('/api/auth/demo-login/', { role }),

    register: (data: Omit<Patient, 'id' | 'user_id' | 'health_id' | 'created_at' | 'subscription_tier'> & { phone: string; password: string }) =>
      post<{ user: User; token: string }>('/api/auth/register/', data),

    logout: () => post<void>('/api/auth/logout/'),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    getDashboard: () =>
      get<AdminDashboard>('/api/admin/dashboard/'),

    getHospitals: () =>
      get<Hospital[]>('/api/admin/hospitals/'),

    createHospital: (data: Omit<Hospital, 'id' | 'created_at' | 'updated_at'> & { owner_name: string; owner_phone: string; owner_email: string; owner_password: string }) =>
      post<Hospital>('/api/admin/hospitals/', data),

    updateHospital: (id: string, data: Partial<Hospital>) =>
      put<Hospital>(`/api/admin/hospitals/${id}/`, data),

    deleteHospital: (id: string) =>
      del<void>(`/api/admin/hospitals/${id}/`),

    toggleHospitalStatus: (id: string) =>
      post<Hospital>(`/api/admin/hospitals/${id}/toggle-status/`),
  },

  // ── Owner ─────────────────────────────────────────────────────────────────
  owner: {
    // hospitalId ignored — backend derives from JWT
    getDashboard: (_hospitalId: string) =>
      get<OwnerDashboard>('/api/owner/dashboard/'),

    getCoOwners: (_hospitalId: string) =>
      get<Owner[]>('/api/owner/co-owners/'),

    addCoOwner: (_hospitalId: string, data: Omit<Owner, 'id' | 'hospital_id' | 'is_primary' | 'status' | 'created_at'>) =>
      post<Owner>('/api/owner/co-owners/', data),

    removeCoOwner: (id: string) =>
      del<void>(`/api/owner/co-owners/${id}/`),

    getManagers: (_hospitalId: string) =>
      get<Manager[]>('/api/owner/managers/'),

    addManager: (_hospitalId: string, data: Omit<Manager, 'id' | 'hospital_id' | 'created_at'>) =>
      post<Manager>('/api/owner/managers/', data),

    updateManager: (id: string, data: Partial<Manager>) =>
      put<Manager>(`/api/owner/managers/${id}/`, data),

    deleteManager: (id: string) =>
      del<void>(`/api/owner/managers/${id}/`),

    getPathologists: (_hospitalId: string) =>
      get<Pathologist[]>('/api/owner/pathologists/'),

    addPathologist: (_hospitalId: string, data: Omit<Pathologist, 'id' | 'hospital_id' | 'created_at'>) =>
      post<Pathologist>('/api/owner/pathologists/', data),

    updatePathologist: (id: string, data: Partial<Pathologist>) =>
      put<Pathologist>(`/api/owner/pathologists/${id}/`, data),

    deletePathologist: (id: string) =>
      del<void>(`/api/owner/pathologists/${id}/`),

    getDoctors: (_hospitalId: string) =>
      get<Doctor[]>('/api/owner/doctors/'),

    addDoctor: (_hospitalId: string, data: Omit<Doctor, 'id' | 'hospital_id' | 'created_at'>) =>
      post<Doctor>('/api/owner/doctors/', data),

    updateDoctor: (id: string, data: Partial<Doctor>) =>
      put<Doctor>(`/api/owner/doctors/${id}/`, data),

    deleteDoctor: (id: string) =>
      del<void>(`/api/owner/doctors/${id}/`),

    getNurses: (_hospitalId: string) =>
      get<Nurse[]>('/api/owner/nurses/'),

    addNurse: (_hospitalId: string, data: Omit<Nurse, 'id' | 'hospital_id' | 'created_at'>) =>
      post<Nurse>('/api/owner/nurses/', data),

    updateNurse: (id: string, data: Partial<Nurse>) =>
      put<Nurse>(`/api/owner/nurses/${id}/`, data),

    deleteNurse: (id: string) =>
      del<void>(`/api/owner/nurses/${id}/`),

    getBeds: (_hospitalId: string) =>
      get<Bed[]>('/api/owner/beds/'),

    addBed: (_hospitalId: string, data: Omit<Bed, 'id' | 'hospital_id' | 'created_at'>) =>
      post<Bed>('/api/owner/beds/', data),

    updateBed: (id: string, data: Partial<Bed>) =>
      put<Bed>(`/api/owner/beds/${id}/`, data),

    deleteBed: (id: string) =>
      del<void>(`/api/owner/beds/${id}/`),

    getLabTests: (_hospitalId: string) =>
      get<LabTest[]>('/api/owner/lab-tests/'),

    addLabTest: (_hospitalId: string, data: Omit<LabTest, 'id' | 'hospital_id' | 'created_at'>) =>
      post<LabTest>('/api/owner/lab-tests/', data),

    updateLabTest: (id: string, data: Partial<LabTest>) =>
      put<LabTest>(`/api/owner/lab-tests/${id}/`, data),

    deleteLabTest: (id: string) =>
      del<void>(`/api/owner/lab-tests/${id}/`),
  },

  // ── Manager ───────────────────────────────────────────────────────────────
  manager: {
    getDashboard: (_hospitalId: string) =>
      get<ManagerDashboard>('/api/manager/dashboard/'),

    getAppointments: (_hospitalId: string) =>
      get<Appointment[]>('/api/manager/appointments/'),

    createAppointment: (_hospitalId: string, data: Omit<Appointment, 'id' | 'hospital_id' | 'admitted' | 'created_at'>) =>
      post<Appointment>('/api/manager/appointments/', data),

    updateAppointment: (id: string, data: Partial<Pick<Appointment, 'doctor_id' | 'doctor_name' | 'date' | 'time' | 'reason' | 'status'>>) =>
      put<Appointment>(`/api/manager/appointments/${id}/`, data),

    deleteAppointment: (id: string) =>
      del<void>(`/api/manager/appointments/${id}/`),

    confirmAppointment: (id: string) =>
      post<Appointment>(`/api/manager/appointments/${id}/confirm/`),

    cancelAppointment: (id: string) =>
      post<Appointment>(`/api/manager/appointments/${id}/cancel/`),

    admitPatient: (appointmentId: string, data: { bed_id: string; nurse_id: string }) =>
      post<Admission>(`/api/manager/appointments/${appointmentId}/admit/`, data),

    getAdmissions: () =>
      get<Admission[]>('/api/manager/admissions/'),

    getAvailableBeds: (_hospitalId: string) =>
      get<Bed[]>('/api/manager/available-beds/'),

    getAvailableNurses: (_hospitalId: string) =>
      get<Nurse[]>('/api/manager/available-nurses/'),

    getLabOrders: (_hospitalId: string) =>
      get<LabOrder[]>('/api/manager/lab-orders/'),

    createLabOrder: (_hospitalId: string, data: Omit<LabOrder, 'id' | 'hospital_id' | 'status' | 'created_at'> & { ordered_by_doctor_id?: string }) =>
      post<LabOrder>('/api/manager/lab-orders/', data),

    assignPathologist: (orderId: string, pathologistId: string, _pathologistName: string) =>
      post<LabOrder>(`/api/manager/lab-orders/${orderId}/assign/`, { pathologist_id: pathologistId }),

    cancelLabOrder: (orderId: string) =>
      post<LabOrder>(`/api/manager/lab-orders/${orderId}/cancel/`),

    getLabResult: (orderId: string) =>
      get<LabResult | null>(`/api/manager/lab-orders/${orderId}/result/`),

    getDoctors: (_hospitalId: string) =>
      get<Doctor[]>('/api/manager/doctors/'),

    getPatients: () =>
      get<Patient[]>('/api/manager/patients/'),

    createWalkInPatient: (data: { name: string; phone: string; age: number; gender: 'Male' | 'Female' | 'Other'; blood_group?: string }) =>
      post<Patient>('/api/manager/walk-in-patient/', data),
  },

  // ── Pathologist ───────────────────────────────────────────────────────────
  pathologist: {
    getDashboard: (_pathologistId: string) =>
      get<PathologistDashboard>('/api/pathologist/dashboard/'),

    getUpcomingTests: (_pathologistId: string) =>
      get<LabOrder[]>('/api/pathologist/upcoming-tests/'),

    submitResult: (orderId: string, data: Pick<LabResult, 'findings' | 'remarks'>, _submittedBy: string) =>
      post<LabResult>(`/api/pathologist/lab-orders/${orderId}/submit-result/`, data),

    getCompletedReports: (_pathologistId: string) =>
      get<Array<LabOrder & { result?: LabResult }>>('/api/pathologist/completed-reports/'),
  },

  // ── Patient ───────────────────────────────────────────────────────────────
  patient: {
    getDashboard: (_patientId: string) =>
      get<Patient>('/api/patient/me/'),

    getMetrics: (_patientId: string) =>
      get<HealthMetric[]>('/api/patient/metrics/'),

    addMetric: (data: Omit<HealthMetric, 'id'>) =>
      post<HealthMetric>('/api/patient/metrics/', data),

    updateMetric: (id: string, data: Partial<HealthMetric>) =>
      put<HealthMetric>(`/api/patient/metrics/${id}/`, data),

    deleteMetric: (id: string) =>
      del<void>(`/api/patient/metrics/${id}/`),

    getReports: (_patientId: string) =>
      get<MedicalReport[]>('/api/patient/reports/'),

    uploadReport: (_patientId: string, data: Omit<MedicalReport, 'id' | 'patient_id' | 'uploaded_at'>) =>
      post<MedicalReport>('/api/patient/reports/', data),

    deleteReport: (id: string) =>
      del<void>(`/api/patient/reports/${id}/`),

    getPrivacyLog: (_patientId: string) =>
      get<ReportAccessLog[]>('/api/patient/privacy-log/'),
  },
}
