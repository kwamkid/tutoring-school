export type UserRole = 'admin' | 'teacher' | 'student'

export interface Profile {
    id: string
    full_name: string
    role: UserRole
    created_at: string
}

export interface Subject {
    id: string
    name: string
    description: string | null
    color: string | null
    created_at: string
}

export interface Package {
    id: string
    name: string
    credits: number
    price: number
    is_active: boolean
    created_at: string
}

export interface PackageSubject {
    package_id: string
    subject_id: string
}

export interface Student {
    id: string
    user_id: string
    parent_name: string | null
    parent_phone: string | null
    created_at: string
}

export interface CreditBalance {
    id: string
    student_id: string
    purchase_id: string
    credits_remaining: number
}

export interface Purchase {
    id: string
    student_id: string
    package_id: string
    status: 'pending' | 'paid'
    created_at: string
    paid_at: string | null
}

export interface Attendance {
    id: string
    student_id: string
    subject_id: string
    teacher_id: string
    credits_used: number
    checked_at: string
    notes: string | null
    status: 'active' | 'cancelled'
    purchase_id: string | null
}

export interface AttendanceLog {
    id: string
    attendance_id: string
    action: 'check_in' | 'cancel'
    performed_by: string
    reason: string | null
    created_at: string
}

// Extended types with relations
export interface PackageWithSubjects extends Package {
    subjects?: Subject[]
}

export interface PurchaseWithDetails extends Purchase {
    package?: Package
    student?: Student & {
        profile?: Profile
    }
}

export interface AttendanceWithDetails extends Attendance {
    student?: Student & {
        profile?: Profile
    }
    subject?: Subject
    teacher?: Profile
}

export interface CreditBalanceWithPurchase extends CreditBalance {
    purchase?: PurchaseWithDetails
}

export interface StudentWithProfile extends Student {
    profile?: Profile
    credit_balances?: CreditBalanceWithPurchase[]
}
