'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

const SUBJECT_COLORS = [
    { value: '#3B82F6', label: 'น้ำเงิน' },
    { value: '#EF4444', label: 'แดง' },
    { value: '#10B981', label: 'เขียว' },
    { value: '#F59E0B', label: 'เหลือง' },
    { value: '#8B5CF6', label: 'ม่วง' },
    { value: '#EC4899', label: 'ชมพู' },
    { value: '#06B6D4', label: 'ฟ้า' },
    { value: '#F97316', label: 'ส้ม' },
    { value: '#6B7280', label: 'เทา' },
]

type Subject = {
    id: string
    name: string
    description: string | null
    color: string | null
    created_at: string
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null)
    const [formData, setFormData] = useState({ name: '', description: '', color: '#6B7280' })
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchSubjects()
    }, [])

    const fetchSubjects = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('name')

            if (error) throw error
            setSubjects(data || [])
        } catch (error) {
            console.error('Error fetching subjects:', error)
        } finally {
            setLoading(false)
        }
    }

    const openAddDialog = () => {
        setIsEditing(false)
        setCurrentSubject(null)
        setFormData({ name: '', description: '', color: '#6B7280' })
        setIsDialogOpen(true)
    }

    const openEditDialog = (subject: Subject) => {
        setIsEditing(true)
        setCurrentSubject(subject)
        setFormData({
            name: subject.name,
            description: subject.description || '',
            color: subject.color || '#6B7280'
        })
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isEditing && currentSubject) {
                const { error } = await supabase
                    .from('subjects')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        color: formData.color
                    })
                    .eq('id', currentSubject.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('subjects')
                    .insert([{
                        name: formData.name,
                        description: formData.description,
                        color: formData.color
                    }])

                if (error) throw error
            }

            // Success
            setIsDialogOpen(false)
            fetchSubjects()
        } catch (error) {
            console.error('Error saving subject:', error)
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบวิชานี้? ข้อมูลที่เกี่ยวข้องอาจได้รับผลกระทบ')) return

        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchSubjects()
        } catch (error) {
            console.error('Error deleting subject:', error)
            alert('ไม่สามารถลบวิชาได้ (อาจมีการใช้งานอยู่)')
        }
    }

    const filteredSubjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-primary">จัดการรายวิชา</h2>
                <Button onClick={openAddDialog} className="shadow-md">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มรายวิชา
                </Button>
            </div>

            {/* List Section */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>รายวิชาทั้งหมด ({subjects.length})</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาวิชา..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อวิชา</TableHead>
                                    <TableHead>รายละเอียด</TableHead>
                                    <TableHead className="w-[100px] text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            {loading ? 'กำลังโหลด...' : 'ไม่พบข้อมูลรายวิชา'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSubjects.map((subject) => (
                                        <TableRow key={subject.id}>
                                            <TableCell className="font-medium">
                                                <span className="inline-flex items-center gap-2">
                                                    <span
                                                        className="inline-block h-3 w-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: subject.color || '#6B7280' }}
                                                    />
                                                    {subject.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>{subject.description || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(subject)}
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(subject.id)}
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog Form */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชาใหม่'}
                        </DialogTitle>
                        <DialogDescription>
                            กรอกข้อมูลรายวิชาที่ต้องการ {isEditing ? 'แก้ไข' : 'เพิ่ม'} ลงในระบบ
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อวิชา <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น คณิตศาสตร์, ภาษาอังกฤษ"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>สีวิชา</Label>
                            <div className="flex flex-wrap gap-2">
                                {SUBJECT_COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.label}
                                        onClick={() => setFormData({ ...formData, color: c.value })}
                                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                                            formData.color === c.value
                                                ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400'
                                                : 'border-transparent hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
