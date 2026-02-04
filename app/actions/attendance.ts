'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function recordAttendance(data: {
    student_id: string
    subject_id: string
    teacher_id: string
    credits_used: number
    notes?: string
}) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('attendance')
            .insert({
                student_id: data.student_id,
                subject_id: data.subject_id,
                teacher_id: data.teacher_id,
                credits_used: data.credits_used,
                notes: data.notes
            })

        if (error) throw error

        revalidatePath('/admin/students')
        revalidatePath('/admin/attendance')
        revalidatePath('/teacher/attendance')

        return { success: true, message: 'เช็คชื่อสำเร็จ' }

    } catch (error: any) {
        console.error('Attendance Error:', error)
        if (error.message?.includes('นักเรียนมีเครดิตไม่เพียงพอ') || error.message?.includes('นักเรียนไม่มีเครดิตสำหรับวิชานี้')) {
            return { success: false, message: 'เครดิตไม่เพียงพอสำหรับการเช็คชื่อ' }
        }
        return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ' }
    }
}

export async function cancelAttendance(data: {
    attendance_id: string
    cancelled_by: string
    reason?: string
}) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase.rpc('cancel_attendance', {
            p_attendance_id: data.attendance_id,
            p_cancelled_by: data.cancelled_by,
            p_reason: data.reason || null
        })

        if (error) throw error

        revalidatePath('/admin/students')
        revalidatePath('/admin/attendance')
        revalidatePath('/teacher/attendance')

        return { success: true, message: 'ยกเลิกการเช็คชื่อสำเร็จ เครดิตถูกคืนแล้ว' }

    } catch (error: any) {
        console.error('Cancel Attendance Error:', error)
        if (error.message?.includes('ไม่พบรายการเช็คชื่อ')) {
            return { success: false, message: 'ไม่พบรายการเช็คชื่อ' }
        }
        if (error.message?.includes('ถูกยกเลิกไปแล้ว')) {
            return { success: false, message: 'รายการนี้ถูกยกเลิกไปแล้ว' }
        }
        return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการยกเลิก' }
    }
}
