'use client'

import CheckInView from '@/components/attendance/check-in-view'

export default function TeacherCheckInPage() {
    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-6">ลงเวลาเรียน (Check-in)</h2>
            <CheckInView canCancel={false} />
        </div>
    )
}
