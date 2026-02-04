'use client'

import CheckInView from '@/components/attendance/check-in-view'

export default function AdminAttendancePage() {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">เช็คชื่อ / ลงเวลาเรียน</h2>
            <CheckInView canCancel={true} />
        </div>
    )
}
