'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import type { Student, Subject, Attendance } from '@/types/database'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function TeacherPage() {
    const [students, setStudents] = useState<any[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [selectedStudent, setSelectedStudent] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)
    const [todayAttendance, setTodayAttendance] = useState<any[]>([])
    const [userId, setUserId] = useState('')
    const supabase = createClient()

    useEffect(() => {
        loadData()
        loadUser()
    }, [])

    const loadUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserId(user.id)
            loadTodayAttendance(user.id)
        }
    }

    const loadData = async () => {
        const [studentsRes, subjectsRes] = await Promise.all([
            supabase.from('students').select('*, profiles(*)').order('created_at'),
            supabase.from('subjects').select('*').order('name'),
        ])

        setStudents(studentsRes.data || [])
        setSubjects(subjectsRes.data || [])
    }

    const loadTodayAttendance = async (teacherId: string) => {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
            .from('attendance')
            .select('*, students(*, profiles(*)), subjects(*)')
            .eq('teacher_id', teacherId)
            .gte('checked_at', `${today}T00:00:00`)
            .lte('checked_at', `${today}T23:59:59`)
            .order('checked_at', { ascending: false })

        setTodayAttendance(data || [])
    }

    const checkForDuplicate = async (studentId: string, subjectId: string) => {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', studentId)
            .eq('subject_id', subjectId)
            .gte('checked_at', `${today}T00:00:00`)
            .lte('checked_at', `${today}T23:59:59`)

        return (data && data.length > 0) ? data.length : 0
    }

    const handleCheckAttendance = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            // Check for duplicates
            const duplicateCount = await checkForDuplicate(selectedStudent, selectedSubject)

            if (duplicateCount > 0) {
                const confirmed = window.confirm(
                    `นักเรียนคนนี้เช็คชื่อวิชานี้ไปแล้ว ${duplicateCount} ครั้งวันนี้\n` +
                    'ต้องการเช็คชื่ออีกครั้งหรือไม่? (สำหรับเรียนติดกัน)'
                )

                if (!confirmed) {
                    setLoading(false)
                    return
                }
            }

            // Check credit balance
            const { data: creditBalance } = await supabase
                .from('credit_balances')
                .select('credits_remaining')
                .eq('student_id', selectedStudent)
                .eq('subject_id', selectedSubject)
                .single()

            if (!creditBalance || creditBalance.credits_remaining < 1) {
                setMessage({
                    type: 'error',
                    text: 'นักเรียนมีเครดิตไม่เพียงพอสำหรับวิชานี้'
                })
                setLoading(false)
                return
            }

            // Create attendance record
            const { error } = await supabase
                .from('attendance')
                .insert({
                    student_id: selectedStudent,
                    subject_id: selectedSubject,
                    teacher_id: userId,
                    credits_used: 1,
                    notes: notes || null,
                })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'เช็คชื่อสำเร็จ! หักเครดิตแล้ว 1 เครดิต'
            })
            setSelectedStudent('')
            setSelectedSubject('')
            setNotes('')
            loadTodayAttendance(userId)

        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'เกิดข้อผิดพลาด'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('ต้องการลบการเช็คชื่อนี้? เครดิตจะถูกคืนให้นักเรียน')) {
            await supabase.from('attendance').delete().eq('id', id)
            loadTodayAttendance(userId)
            setMessage({
                type: 'success',
                text: 'ลบการเช็คชื่อสำเร็จ'
            })
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">เช็คชื่อนักเรียน</h2>

            <Card>
                <CardHeader>
                    <CardTitle>เช็คชื่อ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCheckAttendance} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="student">เลือกนักเรียน</Label>
                                <Select
                                    id="student"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    required
                                    disabled={loading}
                                >
                                    <option value="">-- เลือกนักเรียน --</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.profiles?.full_name || 'ไม่มีชื่อ'}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="subject">เลือกวิชา</Label>
                                <Select
                                    id="subject"
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    required
                                    disabled={loading}
                                >
                                    <option value="">-- เลือกวิชา --</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="เช่น เรียนดี ตั้งใจ"
                                disabled={loading}
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' :
                                    message.type === 'error' ? 'bg-red-50 text-red-700' :
                                        'bg-yellow-50 text-yellow-700'
                                }`}>
                                {message.type === 'success' ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5" />
                                )}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            disabled={loading}
                        >
                            {loading ? 'กำลังเช็คชื่อ...' : 'เช็คชื่อและหักเครดิต'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>เช็คชื่อวันนี้</CardTitle>
                </CardHeader>
                <CardContent>
                    {todayAttendance.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีการเช็คชื่อวันนี้</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เวลา</TableHead>
                                    <TableHead>นักเรียน</TableHead>
                                    <TableHead>วิชา</TableHead>
                                    <TableHead>หมายเหตุ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {todayAttendance.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell>{formatDateTime(att.checked_at)}</TableCell>
                                        <TableCell className="font-medium">
                                            {att.students?.profiles?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>{att.subjects?.name || '-'}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {att.notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(att.id)}
                                            >
                                                ลบ
                                            </Button>
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
