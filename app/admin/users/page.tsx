'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Shield, GraduationCap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createStaff, deleteStaff } from '@/app/actions/admin'
import { Badge } from '@/components/ui/badge'

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'teacher' as 'teacher' | 'admin',
        password: ''
    })

    const supabase = createClient()

    useEffect(() => {
        loadStaff()
    }, [])

    const loadStaff = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['admin', 'teacher'])
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error loading staff:', error)
        } else {
            setStaff(data || [])
        }
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!formData.name || !formData.email) {
            alert('กรุณากรอกชื่อและอีเมล')
            return
        }

        const res = await createStaff({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            password: formData.password || undefined // Allow auto-gen if empty
        })

        if (res.success) {
            alert(`สร้างบัญชีสำเร็จ!\nEmail: ${res.email}\nPassword: ${res.password}`)
            setIsAddOpen(false)
            setFormData({ name: '', email: '', role: 'teacher', password: '' })
            loadStaff()
        } else {
            alert('เกิดข้อผิดพลาด: ' + res.message)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบผู้ใช้งาน "${name}" ใช่หรือไม่?`)) return

        const res = await deleteStaff(id)
        if (res.success) {
            loadStaff()
        } else {
            alert('ลบไม่สำเร็จ: ' + res.message)
        }
    }

    const filteredStaff = staff.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.role && s.role.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-primary">จัดการบุคลากร</h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            เพิ่มเจ้าหน้าที่
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>เพิ่มเจ้าหน้าที่ใหม่</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>ชื่อ-นามสกุล</Label>
                                <Input
                                    placeholder="เช่น ครูกานต์ สอนดี"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>อีเมล (สำหรับเข้าสู่ระบบ)</Label>
                                <Input
                                    type="email"
                                    placeholder="teacher@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>รหัสผ่าน (ถ้าไม่กรอก ระบบจะสุ่มให้)</Label>
                                <Input
                                    type="text"
                                    placeholder="กำหนดรหัสผ่าน..."
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>บทบาท</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val: 'admin' | 'teacher') => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="teacher">คุณครู (Teacher)</SelectItem>
                                        <SelectItem value="admin">ผู้ดูแลระบบ (Admin)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>ยกเลิก</Button>
                            <Button onClick={handleCreate}>บันทึก</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>รายชื่อเจ้าหน้าที่ทั้งหมด ({staff.length})</CardTitle>
                        <Input
                            placeholder="ค้นหาชื่อ..."
                            className="max-w-xs"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อ-นามสกุล</TableHead>
                                <TableHead>บทบาท</TableHead>
                                <TableHead>วันที่สร้าง</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.full_name}</TableCell>
                                    <TableCell>
                                        {s.role === 'admin' ? (
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                                                <Shield className="h-3 w-3 mr-1" /> Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                <GraduationCap className="h-3 w-3 mr-1" /> Teacher
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(s.created_at).toLocaleDateString('th-TH')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(s.id, s.full_name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
