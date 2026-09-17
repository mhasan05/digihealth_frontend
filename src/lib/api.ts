import type {
  User, Hospital, Owner, Manager, Pathologist, Doctor, RegistryDoctor, Nurse,
  MedicalAssistant, Midwife, RoleApplication, AdminRoleApplication, RoleApplicationType,
  Bed, LabTest, Patient, HealthMetric, MedicalReport, ReportAccessLog,
  Appointment, Admission, LabOrder, LabResult,
  AdminDashboard, OwnerDashboard, ManagerDashboard, PathologistDashboard,
} from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // Import dynamically to avoid circular dependency with the store
  const { useAuthStore } = await import('@/store/auth-store')
  const token = useAuthStore.getState().accessToken

  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      // Let the browser set Content-Type (with boundary) for multipart uploads
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  })

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as T

  // Read as text first — a reverse proxy or an unhandled server error can
  // return an HTML error page instead of JSON, and calling res.json()
  // directly on that throws an opaque "Unexpected token '<'" parse error.
  const raw = await res.text()
  let body: unknown
  if (raw) {
    try { body = JSON.parse(raw) } catch { /* not JSON — fall through to the raw-text error below */ }
  }

  if (!res.ok) {
    const parsed = body as { detail?: string; message?: string } | undefined
    const message = parsed?.detail ?? parsed?.message
      ?? (raw ? `Server error (${res.status}): ${raw.slice(0, 200)}` : `Request failed (${res.status})`)
    throw new Error(message)
  }

  if (!raw) return undefined as T
  if (body === undefined) throw new Error(`Unexpected non-JSON response (${res.status})`)
  return body as T
}

const encodeBody = (data?: unknown) =>
  data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data)

const get  = <T>(path: string)                  => req<T>(path)
const post = <T>(path: string, data?: unknown)  => req<T>(path, { method: 'POST',   body: encodeBody(data) })
const put  = <T>(path: string, data?: unknown)  => req<T>(path, { method: 'PUT',    body: encodeBody(data) })
const del  = <T>(path: string)                  => req<T>(path, { method: 'DELETE' })

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login: (credentials: { identifier: string; password: string; method: 'phone' | 'health_id' }) =>
      post<{ user: User; token: string }>('/api/auth/login/', credentials),

    loginAsRole: (role: string) =>
      post<{ user: User; token: string }>('/api/auth/demo-login/', { role }),

    register: (data: { name: string; phone: string; password: string }) =>
      post<{ user: User; token: string }>('/api/auth/register/', data),

    logout: () => post<void>('/api/auth/logout/'),

    changePassword: (data: { current_password: string; new_password: string }) =>
      post<{ detail: string }>('/api/auth/change-password/', data),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    getDashboard: () =>
      get<AdminDashboard>('/api/admin/dashboard/'),

    getHospitals: () =>
      get<Hospital[]>('/api/admin/hospitals/'),

    createHospital: (data: Omit<Hospital, 'id' | 'created_at' | 'updated_at'> & {
      owner_name: string
      owner_phone: string
      owner_email: string
      owner_password: string
      owner_age: number
      owner_gender: 'Male' | 'Female' | 'Other'
      owner_blood_group: string
      owner_address: string
    }) =>
      post<Hospital>('/api/admin/hospitals/', data),

    updateHospital: (id: string, data: Partial<Hospital>) =>
      put<Hospital>(`/api/admin/hospitals/${id}/`, data),

    deleteHospital: (id: string) =>
      del<void>(`/api/admin/hospitals/${id}/`),

    toggleHospitalStatus: (id: string) =>
      post<Hospital>(`/api/admin/hospitals/${id}/toggle-status/`),

    // Doctor registry (system-wide)
    getDoctors: (q?: string) =>
      get<RegistryDoctor[]>(`/api/admin/doctors/${q ? `?q=${encodeURIComponent(q)}` : ''}`),

    createDoctor: (data: { name: string; phone: string; bmdc_registration_no?: string; specialization?: string }) =>
      post<RegistryDoctor>('/api/admin/doctors/', data),

    updateDoctor: (id: string, data: Partial<{ name: string; phone: string; bmdc_registration_no: string; specialization: string }>) =>
      put<RegistryDoctor>(`/api/admin/doctors/${id}/`, data),

    deleteDoctor: (id: string) =>
      del<void>(`/api/admin/doctors/${id}/`),

    setDoctorAvailability: (id: string, availability_status: 'Available' | 'Unavailable') =>
      post<RegistryDoctor>(`/api/admin/doctors/${id}/availability/`, { availability_status }),

    // Role applications (patient self-service requests for an additional role)
    getRoleApplications: (params?: { status?: string; role_type?: RoleApplicationType; q?: string }) => {
      const entries = Object.entries(params ?? {}).filter(([, v]) => !!v) as [string, string][]
      const qs = new URLSearchParams(entries).toString()
      return get<AdminRoleApplication[]>(`/api/admin/role-applications/${qs ? `?${qs}` : ''}`)
    },

    approveRoleApplication: (id: string) =>
      post<AdminRoleApplication>(`/api/admin/role-applications/${id}/approve/`),

    rejectRoleApplication: (id: string, reason?: string) =>
      post<AdminRoleApplication>(`/api/admin/role-applications/${id}/reject/`, { reason }),
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

    updatePathologist: (id: string, data: Partial<Pathologist>) =>
      put<Pathologist>(`/api/owner/pathologists/${id}/`, data),

    deletePathologist: (id: string) =>
      del<void>(`/api/owner/pathologists/${id}/`),

    searchAvailablePathologists: (q: string) =>
      get<Pathologist[]>(`/api/owner/pathologists/available/?q=${encodeURIComponent(q)}`),

    importPathologist: (pathologist_id: string, specialization?: string) =>
      post<Pathologist>('/api/owner/pathologists/import/', { pathologist_id, specialization }),

    getDoctors: (_hospitalId: string) =>
      get<Doctor[]>('/api/owner/doctors/'),

    searchRegistryDoctors: (q: string) =>
      get<RegistryDoctor[]>(`/api/owner/doctors/search/?q=${encodeURIComponent(q)}`),

    attachDoctor: (_hospitalId: string, data: { doctor_id: string; schedule?: string; status?: 'Active' | 'Inactive' }) =>
      post<Doctor>('/api/owner/doctors/', data),

    updateDoctor: (id: string, data: Partial<Pick<Doctor, 'schedule' | 'status'>>) =>
      put<Doctor>(`/api/owner/doctors/${id}/`, data),

    detachDoctor: (id: string) =>
      del<void>(`/api/owner/doctors/${id}/`),

    getNurses: (_hospitalId: string) =>
      get<Nurse[]>('/api/owner/nurses/'),

    updateNurse: (id: string, data: Partial<Nurse>) =>
      put<Nurse>(`/api/owner/nurses/${id}/`, data),

    deleteNurse: (id: string) =>
      del<void>(`/api/owner/nurses/${id}/`),

    searchAvailableNurses: (q: string) =>
      get<Nurse[]>(`/api/owner/nurses/available/?q=${encodeURIComponent(q)}`),

    importNurse: (nurse_id: string, ward?: string) =>
      post<Nurse>('/api/owner/nurses/import/', { nurse_id, ward }),

    getMedicalAssistants: (_hospitalId: string) =>
      get<MedicalAssistant[]>('/api/owner/medical-assistants/'),

    updateMedicalAssistant: (id: string, data: Partial<MedicalAssistant>) =>
      put<MedicalAssistant>(`/api/owner/medical-assistants/${id}/`, data),

    deleteMedicalAssistant: (id: string) =>
      del<void>(`/api/owner/medical-assistants/${id}/`),

    searchAvailableMedicalAssistants: (q: string) =>
      get<MedicalAssistant[]>(`/api/owner/medical-assistants/available/?q=${encodeURIComponent(q)}`),

    importMedicalAssistant: (medical_assistant_id: string, ward?: string) =>
      post<MedicalAssistant>('/api/owner/medical-assistants/import/', { medical_assistant_id, ward }),

    getMidwives: (_hospitalId: string) =>
      get<Midwife[]>('/api/owner/midwives/'),

    updateMidwife: (id: string, data: Partial<Midwife>) =>
      put<Midwife>(`/api/owner/midwives/${id}/`, data),

    deleteMidwife: (id: string) =>
      del<void>(`/api/owner/midwives/${id}/`),

    searchAvailableMidwives: (q: string) =>
      get<Midwife[]>(`/api/owner/midwives/available/?q=${encodeURIComponent(q)}`),

    importMidwife: (midwife_id: string, ward?: string) =>
      post<Midwife>('/api/owner/midwives/import/', { midwife_id, ward }),

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

    admitPatient: (appointmentId: string, data: { bed_id: string; nurse_id?: string }) =>
      post<Admission>(`/api/manager/appointments/${appointmentId}/admit/`, data),

    getAdmissions: () =>
      get<Admission[]>('/api/manager/admissions/'),

    directAdmit: (data: {
      phone: string
      bed_id: string
      nurse_id?: string
      doctor_id?: string
      reason?: string
      name?: string
      age?: number
      gender?: 'Male' | 'Female' | 'Other'
      blood_group?: string
    }) =>
      post<Admission & { created_new_user?: boolean }>('/api/manager/admissions/', data),

    updateAdmission: (id: string, data: {
      bed_id?: string
      nurse_id?: string
      doctor_id?: string
      reason?: string
    }) =>
      put<Admission>(`/api/manager/admissions/${id}/`, data),

    dischargeAdmission: (id: string) =>
      del<Admission>(`/api/manager/admissions/${id}/`),

    updatePatient: (id: string, data: Partial<Pick<Patient, 'name' | 'age' | 'gender' | 'blood_group' | 'address'>>) =>
      put<Patient>(`/api/manager/patients/${id}/`, data),

    getAvailableBeds: (_hospitalId: string) =>
      get<Bed[]>('/api/manager/available-beds/'),

    getAvailableNurses: (_hospitalId: string) =>
      get<Nurse[]>('/api/manager/available-nurses/'),

    getLabOrders: (_hospitalId: string) =>
      get<LabOrder[]>('/api/manager/lab-orders/'),

    createLabOrder: (_hospitalId: string, data: Omit<LabOrder, 'id' | 'hospital_id' | 'status' | 'created_at'> & { ordered_by_doctor_id?: string; assigned_pathologist_id?: string }) =>
      post<LabOrder>('/api/manager/lab-orders/', data),

    assignPathologist: (orderId: string, pathologistId: string, _pathologistName: string) =>
      post<LabOrder>(`/api/manager/lab-orders/${orderId}/assign/`, { pathologist_id: pathologistId }),

    cancelLabOrder: (orderId: string) =>
      post<LabOrder>(`/api/manager/lab-orders/${orderId}/cancel/`),

    getLabResult: (orderId: string) =>
      get<LabResult | null>(`/api/manager/lab-orders/${orderId}/result/`),

    getDoctors: (_hospitalId: string) =>
      get<Doctor[]>('/api/manager/doctors/'),

    getPathologists: (_hospitalId: string) =>
      get<(Pathologist & { active_test_count: number })[]>('/api/manager/pathologists/'),

    getLabTests: (_hospitalId: string) =>
      get<LabTest[]>('/api/manager/lab-tests/'),

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

    updateMyProfile: (data: Partial<Pick<Patient, 'name' | 'age' | 'date_of_birth' | 'gender' | 'blood_group' | 'address' | 'conditions' | 'nid'>> & { email?: string }) =>
      put<Patient>('/api/patient/me/', data),

    setPrivacy: (is_private: boolean) =>
      put<Patient>('/api/patient/me/', { is_private }),

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

    uploadReport: (_patientId: string, file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', file.name)
      return post<MedicalReport>('/api/patient/reports/', fd)
    },

    deleteReport: (id: string) =>
      del<void>(`/api/patient/reports/${id}/`),

    getPrivacyLog: (_patientId: string) =>
      get<ReportAccessLog[]>('/api/patient/privacy-log/'),

    getRoleApplications: () =>
      get<RoleApplication[]>('/api/patient/role-applications/'),

    submitRoleApplication: (data: FormData) =>
      post<RoleApplication>('/api/patient/role-applications/', data),
  },

  // ── Doctor ────────────────────────────────────────────────────────────────
  doctor: {
    getMe: () =>
      get<Doctor & {
        hospitals: { id: string; name: string; schedule: string; status: 'Active' | 'Inactive' }[]
      }>('/api/doctor/me/'),

    searchPatients: (q: string) =>
      get<Patient[]>(`/api/doctor/patients/?q=${encodeURIComponent(q)}`),

    getPatient: (id: string) =>
      get<Patient>(`/api/doctor/patients/${id}/`),

    setHivStatus: (id: string, hiv_status: 'Negative' | 'Positive') =>
      post<Patient>(`/api/doctor/patients/${id}/hiv-status/`, { hiv_status }),

    listReports: (patientId: string) =>
      get<MedicalReport[]>(`/api/doctor/patients/${patientId}/reports/`),

    logAccess: (
      patientId: string,
      action: 'searched' | 'viewed' | 'downloaded',
      reportId?: string,
    ) =>
      post<{ detail: string }>(`/api/doctor/patients/${patientId}/access-log/`, {
        action,
        ...(reportId ? { report_id: reportId } : {}),
      }),
  },
}
