'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Clock, CheckCircle } from 'lucide-react'

export default function HistoryPage() {
    const [purchases, setPurchases] = useState<any[]>([])
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Get student record
            const { data: studentData } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (studentData) {
                // Load purchases
                const { data: purchasesData } = await supabase
                    .from('purchases')
                    .select('*, packages(*)')
                    .eq('student_id', studentData.id)
                    .order('created_at', { ascending: false })

                setPurchases(purchasesData || [])

                // Load attendance
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('*, subjects(*)')
                    .eq('student_id', studentData.id)
                    .order('checked_at', { ascending: false })

                setAttendance(attendanceData || [])
            }
        }
        setLoading(false)
    }

    if (loading) {
        return <div>กำลังโหลด...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">ประวัติ</h2>

            <Card>
                <CardHeader>
                    <CardTitle>ประวัติการซื้อแพ็คเกจ</CardTitle>
                </CardHeader>
                <CardContent>
                    {purchases.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีประวัติการซื้อ</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่สั่งซื้อ</TableHead>
                                    <TableHead>แพ็คเกจ</TableHead>
                                    <TableHead>เครดิต</TableHead>
                                    <TableHead>ราคา</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchases.map((purchase) => (
                                    <TableRow key={purchase.id}>
                                        <TableCell>{formatDateTime(purchase.created_at)}</TableCell>
                                        <TableCell className="font-medium">
                                            {purchase.packages?.name || '-'}
                                        </TableCell>
                                        <TableCell>{purchase.packages?.credits || 0} เครดิต</TableCell>
                                        <TableCell className="font-bold">
                                            {purchase.packages ? formatCurrency(purchase.packages.price) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {purchase.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                                                    <CheckCircle className="h-4 w-4" />
                                                    ชำระแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-sm">
                                                    <Clock className="h-4 w-4" />
                                                    รอชำระ
                                                </span>
                                            )}
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
                    <CardTitle>ประวัติการเข้าเรียน</CardTitle>
                </CardHeader>
                <CardContent>
                    {attendance.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีประวัติการเข้าเรียน</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่เรียน</TableHead>
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
                                            {att.subjects?.name || '-'}
                                        </TableCell>
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
