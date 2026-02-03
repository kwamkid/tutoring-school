'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'

export default function TeacherAttendancePage() {
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadAttendance()
    }, [])

    const loadAttendance = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data } = await supabase
                .from('attendance')
                .select('*, students(*, profiles(*)), subjects(*)')
                .eq('teacher_id', user.id)
                .order('checked_at', { ascending: false })
                .limit(100)

            setAttendance(data || [])
        }
        setLoading(false)
    }

    if (loading) {
        return <div>กำลังโหลด...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">ประวัติการเช็คชื่อ</h2>

            <Card>
                <CardHeader>
                    <CardTitle>การเช็คชื่อทั้งหมด (100 รายการล่าสุด)</CardTitle>
                </CardHeader>
                <CardContent>
                    {attendance.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีประวัติการเช็คชื่อ</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่/เวลา</TableHead>
                                    <TableHead>นักเรียน</TableHead>
                                    <TableHead>วิชา</TableHead>
                                    <TableHead>เครดิตที่ใช้</TableHead>
                                    <TableHead>หมายเหตุ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendance.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell>{formatDateTime(att.checked_at)}</TableCell>
                                        <TableCell className="font-medium">
                                            {att.students?.profiles?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>{att.subjects?.name || '-'}</TableCell>
                                        <TableCell>{att.credits_used} เครดิต</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {att.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
