'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface StudentDashboardViewProps {
    studentId: string
    studentName?: string
}

export default function StudentDashboardView({ studentId, studentName }: StudentDashboardViewProps) {
    const [credits, setCredits] = useState<any[]>([])
    const [recentAttendance, setRecentAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        if (studentId) {
            loadData()
        }
    }, [studentId])

    const loadData = async () => {
        setLoading(true)

        // Load credit balances with purchase -> package -> package_subjects -> subjects
        const { data: creditsData } = await supabase
            .from('credit_balances')
            .select('*, purchases(id, package_id, paid_at, packages(id, name, package_subjects(subject_id, subjects(name))))')
            .eq('student_id', studentId)
            .gt('credits_remaining', 0)

        setCredits(creditsData || [])

        // Load recent attendance (only active)
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*, subjects(*)')
            .eq('student_id', studentId)
            .eq('status', 'active')
            .order('checked_at', { ascending: false })
            .limit(5)

        setRecentAttendance(attendanceData || [])
        setLoading(false)
    }

    if (loading) {
        return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>
    }

    const totalCredits = credits.reduce((sum, c) => sum + c.credits_remaining, 0)

    // Collect unique subjects from all credit pools
    const subjectSet = new Set<string>()
    credits.forEach((credit) => {
        const packageSubjects = credit.purchases?.packages?.package_subjects || []
        packageSubjects.forEach((ps: any) => {
            if (ps.subjects?.name) subjectSet.add(ps.subjects.name)
        })
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <div>
                    <h2 className="text-2xl font-bold text-primary">
                        {studentName ? `น้อง${studentName}` : 'ข้อมูลการเรียน'}
                    </h2>
                    <p className="text-gray-500 text-sm">ภาพรวมเครดิตและการเข้าเรียน</p>
                </div>
                <Link href={`/student/purchase?studentId=${studentId}`}>
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        เติมเครดิต
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:shadow-md transition-shadow border-t-4 border-t-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            เครดิตรวมทั้งหมด
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-orange-50">
                            <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {totalCredits} <span className="text-sm font-normal text-gray-500">เครดิต</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            วิชาที่เรียนได้
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-50">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {subjectSet.size} <span className="text-sm font-normal text-gray-500">วิชา</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>เครดิตคงเหลือ</CardTitle>
                </CardHeader>
                <CardContent>
                    {credits.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">ยังไม่มีเครดิต</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>แพ็กเกจ</TableHead>
                                    <TableHead>วิชาที่ใช้ได้</TableHead>
                                    <TableHead className="text-right">เครดิตคงเหลือ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {credits.map((credit) => {
                                    const packageName = credit.purchases?.packages?.name || '-'
                                    const packageSubjects = credit.purchases?.packages?.package_subjects || []
                                    const subjectNames = packageSubjects
                                        .map((ps: any) => ps.subjects?.name)
                                        .filter(Boolean)

                                    return (
                                        <TableRow key={credit.id}>
                                            <TableCell className="font-medium">
                                                {packageName}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {subjectNames.map((name: string) => (
                                                        <Badge key={name} variant="secondary" className="text-xs">
                                                            {name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-lg font-bold text-primary">
                                                    {credit.credits_remaining}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {recentAttendance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>ประวัติการเข้าเรียนล่าสุด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่</TableHead>
                                    <TableHead>วิชา</TableHead>
                                    <TableHead className="text-right">เครดิตที่ใช้</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentAttendance.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell>
                                            {new Date(att.checked_at).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell>{att.subjects?.name || '-'}</TableCell>
                                        <TableCell className="text-right text-red-500 font-medium">
                                            -{att.credits_used}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
