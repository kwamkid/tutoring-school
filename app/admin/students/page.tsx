'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, UserPlus, Eye, Coins, Pencil, Save, X } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { updateStudent, updateParent } from '@/app/actions/admin'

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})

    const supabase = createClient()

    useEffect(() => {
        loadStudents()
    }, [])

    const loadStudents = async () => {
        setLoading(true)
        // 1. Fetch Students
        const { data: studentsData, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error loading students:', error)
            setLoading(false)
            return
        }

        // 2. Fetch Profiles for Parents
        const parentIds = Array.from(new Set(studentsData.map(s => s.parent_id)))
        let parentsMap: Record<string, any> = {}
        if (parentIds.length > 0) {
            const { data: parentsData } = await supabase
                .from('profiles')
                .select('*')
                .in('id', parentIds)

            if (parentsData) {
                parentsData.forEach(p => {
                    parentsMap[p.id] = p
                })
            }
        }

        // 3. Fetch Credits
        const studentIds = studentsData.map(s => s.id)
        let creditsMap: Record<string, number> = {}
        if (studentIds.length > 0) {
            const { data: creditsData } = await supabase
                .from('credit_balances')
                .select('student_id, credits_remaining')
                .in('student_id', studentIds)

            if (creditsData) {
                creditsData.forEach(c => {
                    const current = creditsMap[c.student_id] || 0
                    creditsMap[c.student_id] = current + c.credits_remaining
                })
            }
        }

        const mergedStudents = studentsData.map(s => ({
            ...s,
            parent: parentsMap[s.parent_id],
            total_credits: creditsMap[s.id] || 0
        }))

        setStudents(mergedStudents)
        setLoading(false)
    }

    const filteredStudents = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.nickname && student.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.parent?.full_name && student.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleEditClick = () => {
        setEditForm({
            ...selectedStudent,
            parent_full_name: selectedStudent.parent?.full_name,
            parent_phone: selectedStudent.parent?.phone,
            parent_secondary_phone: selectedStudent.parent?.secondary_phone,
            parent_address: selectedStudent.parent?.address,
        })
        setIsEditing(true)
    }

    const handleSave = async () => {
        if (!editForm.full_name) {
            alert('กรุณากรอกชื่อ-นามสกุลนักเรียน')
            return
        }

        // 1. Update Student
        const studentRes = await updateStudent(selectedStudent.id, {
            full_name: editForm.full_name,
            nickname: editForm.nickname,
            grade: editForm.grade,
            school_name: editForm.school_name,
            birthdate: editForm.birthdate,
            emergency_contact: editForm.emergency_contact
        })

        if (!studentRes.success) {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน: ' + studentRes.message)
            return
        }

        // 2. Update Parent (if exists)
        if (selectedStudent.parent_id) {
            const parentRes = await updateParent(selectedStudent.parent_id, {
                full_name: editForm.parent_full_name,
                phone: editForm.parent_phone,
                secondary_phone: editForm.parent_secondary_phone,
                address: editForm.parent_address,
            })

            if (!parentRes.success) {
                alert('บันทึกข้อมูลนักเรียนสำเร็จ แต่บันทึกข้อมูลผู้ปกครองไม่สำเร็จ: ' + parentRes.message)
            }
        }

        alert('บันทึกข้อมูลเรียบร้อย')
        setIsEditing(false)
        setDetailOpen(false)
        loadStudents()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-primary">จัดการนักเรียน</h2>
                <Link href="/admin/students/register">
                    <Button className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        ลงทะเบียนนักเรียนใหม่
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>รายชื่อนักเรียนทั้งหมด ({students.length})</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาชื่อ, ชื่อเล่น, ผู้ปกครอง..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-secondary/30 rounded-lg border border-dashed border-primary/20">
                            <p className="text-lg font-medium text-primary">
                                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีนักเรียนในระบบ'}
                            </p>
                            {!searchTerm && <p className="text-sm mt-2">เริ่มจากกดปุ่ม "ลงทะเบียนนักเรียนใหม่" ด้านบน</p>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อ-นามสกุล</TableHead>
                                    <TableHead>เบอร์โทร</TableHead>
                                    <TableHead>ผู้ปกครอง</TableHead>
                                    <TableHead>เครดิตรวม</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="font-medium">{student.full_name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {student.nickname ? `น้อง${student.nickname}` : '-'}
                                                {student.school_name && ` • ${student.school_name}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.parent?.phone || '-'}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{student.parent?.full_name || 'ไม่ระบุ'}</div>
                                            {student.parent?.secondary_phone && (
                                                <div className="text-xs text-muted-foreground">สำรอง: {student.parent.secondary_phone}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={student.total_credits > 0 ? "default" : "secondary"} className={student.total_credits > 0 ? "bg-green-600" : ""}>
                                                <Coins className="h-3 w-3 mr-1" />
                                                {student.total_credits}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="hover:text-primary hover:border-primary"
                                                onClick={() => {
                                                    setSelectedStudent(student)
                                                    setIsEditing(false)
                                                    setDetailOpen(true)
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                ดูข้อมูล
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between mr-8">
                            <DialogTitle>
                                {isEditing ? 'แก้ไขข้อมูล' : `ข้อมูลนักเรียน: ${selectedStudent?.full_name}`}
                            </DialogTitle>
                            {!isEditing && (
                                <Button size="sm" variant="outline" onClick={handleEditClick}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    แก้ไข
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            {/* --- Student Section --- */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 text-primary">เกี่ยวกับนักเรียน</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>ชื่อ-นามสกุล</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.full_name || ''}
                                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.full_name}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">ชื่อเล่น</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.nickname || ''}
                                                onChange={e => setEditForm({ ...editForm, nickname: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.nickname || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">โรงเรียน</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.school_name || ''}
                                                onChange={e => setEditForm({ ...editForm, school_name: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.school_name || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">ระดับชั้น</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.grade || ''}
                                                onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.grade || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">วันเกิด</Label>
                                        {isEditing ? (
                                            <Input
                                                type="date"
                                                value={editForm.birthdate || ''}
                                                onChange={e => setEditForm({ ...editForm, birthdate: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.birthdate || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">ติดต่อฉุกเฉิน</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.emergency_contact || ''}
                                                onChange={e => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                                            />
                                        ) : <div className="font-medium text-red-600 pl-1">{selectedStudent.emergency_contact || '-'}</div>}
                                    </div>
                                </div>
                            </div>

                            {/* --- Parent Section --- */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 text-primary">ข้อมูลผู้ปกครอง</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>ชื่อผู้ปกครอง</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.parent_full_name || ''}
                                                onChange={e => setEditForm({ ...editForm, parent_full_name: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.parent?.full_name || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">เบอร์โทรศัพท์</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.parent_phone || ''}
                                                onChange={e => setEditForm({ ...editForm, parent_phone: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.parent?.phone || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">เบอร์สำรอง (ถ้ามี)</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.parent_secondary_phone || ''}
                                                onChange={e => setEditForm({ ...editForm, parent_secondary_phone: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.parent?.secondary_phone || '-'}</div>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">Email</Label>
                                        <div className="font-medium pl-1 text-muted-foreground">{selectedStudent.parent?.email || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground font-normal text-xs">ที่อยู่</Label>
                                        {isEditing ? (
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={editForm.parent_address || ''}
                                                onChange={e => setEditForm({ ...editForm, parent_address: e.target.value })}
                                            />
                                        ) : <div className="font-medium pl-1">{selectedStudent.parent?.address || '-'}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {isEditing && (
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                                <Save className="h-4 w-4 mr-2" />
                                บันทึกข้อมูล
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
