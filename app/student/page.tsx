'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StudentDashboardView from '@/components/student-dashboard-view'

export default function StudentDashboard() {
    const [studentData, setStudentData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadStudent()
    }, [])

    const loadStudent = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Get student record linked to this user
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setStudentData(data)
            }
        }
        setLoading(false)
    }

    if (loading) return <div>กำลังโหลด...</div>

    if (!studentData) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-bold">ไม่พบข้อมูลนักเรียน</h2>
                <p className="text-gray-500">บัญชีของคุณอาจจะยังไม่ได้เชื่อมต่อกับข้อมูลนักเรียน</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <StudentDashboardView
                studentId={studentData.id}
                studentName={studentData.nickname || studentData.full_name}
            />
        </div>
    )
}
