'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ReportsPage() {
    const [revenue, setRevenue] = useState<any[]>([])
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadReports()
    }, [])

    const loadReports = async () => {
        setLoading(true)

        // Load paid purchases with package info
        const { data: paidPurchases } = await supabase
            .from('purchases')
            .select('*, packages(*), students(*, profiles(*))')
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })

        setRevenue(paidPurchases || [])

        // Load attendance records
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*, students(*, profiles(*)), subjects(*)')
            .order('checked_at', { ascending: false })
            .limit(50)

        setAttendance(attendanceData || [])
        setLoading(false)
    }

    const totalRevenue = revenue.reduce((sum, r) => sum + (r.packages?.price || 0), 0)

    if (loading) {
        return <div>กำลังโหลด...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">รายงาน</h2>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>สรุปรายได้</span>
                        <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalRevenue)}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {revenue.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีรายได้</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่ชำระ</TableHead>
                                    <TableHead>นักเรียน</TableHead>
                                    <TableHead>แพ็คเกจ</TableHead>
                                    <TableHead className="text-right">ราคา</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {revenue.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            {r.paid_at ? formatDate(r.paid_at) : '-'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {r.students?.profiles?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>{r.packages?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-bold">
                                            {r.packages ? formatCurrency(r.packages.price) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>สรุปการเข้าเรียน (50 รายการล่าสุด)</CardTitle>
                </CardHeader>
                <CardContent>
                    {attendance.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีบันทึกการเข้าเรียน</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่เรียน</TableHead>
                                    <TableHead>นักเรียน</TableHead>
                                    <TableHead>วิชา</TableHead>
                                    <TableHead className="text-right">เครดิตที่ใช้</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendance.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>{formatDate(a.checked_at)}</TableCell>
                                        <TableCell className="font-medium">
                                            {a.students?.profiles?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>{a.subjects?.name || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {a.credits_used} เครดิต
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
