'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { CheckCircle, Plus, Trash2, ChevronsUpDown, Check } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from '@/components/ui/label'
import { createBill, markBillAsPaid, deleteBill } from '@/app/actions/admin'

export default function BillsPage() {
    const [bills, setBills] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newBill, setNewBill] = useState({ studentId: '', packageId: '' })
    const [studentComboOpen, setStudentComboOpen] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        // 1. Load Bills
        const { data: billsData } = await supabase
            .from('purchases')
            .select(`
                *,
                packages(*),
                students(id, full_name, nickname)
            `)
            .order('created_at', { ascending: false })

        setBills(billsData || [])

        // 2. Load Students (For selector)
        const { data: studentsData } = await supabase
            .from('students')
            .select('id, full_name, nickname')
            .order('full_name')

        setStudents(studentsData || [])

        // 3. Load Active Packages
        const { data: packagesData } = await supabase
            .from('packages')
            .select('*')
            .eq('is_active', true)
            .order('price')

        setPackages(packagesData || [])

        setLoading(false)
    }

    const handleCreateBill = async () => {
        if (!newBill.studentId || !newBill.packageId) {
            alert('กรุณาเลือกนักเรียนและแพ็คเกจ')
            return
        }

        const res = await createBill(newBill.studentId, newBill.packageId)

        if (res.success) {
            setIsCreateOpen(false)
            setNewBill({ studentId: '', packageId: '' })
            loadData()
        } else {
            alert('เกิดข้อผิดพลาด: ' + res.message)
        }
    }

    const handleMarkAsPaid = async (id: string, credits: number) => {
        if (confirm(`ยืนยันการชำระเงิน? ระบบจะเติม ${credits} เครดิตให้นักเรียนทันที`)) {
            const res = await markBillAsPaid(id)

            if (res.success) {
                loadData()
            } else {
                alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ: ' + res.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('ยืนยันการลบบิลนี้?')) {
            const res = await deleteBill(id)

            if (res.success) {
                loadData()
            } else {
                alert('ไม่สามารถลบบิลได้: ' + res.message)
            }
        }
    }

    const pendingBills = bills.filter(b => b.status === 'pending')
    const paidBills = bills.filter(b => b.status === 'paid')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary">จัดการบิล & การชำระเงิน</h2>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            ออกบิลใหม่
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>สร้างบิลเรียกเก็บเงิน</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2 flex flex-col">
                                <Label className="mb-1">เลือกนักเรียน</Label>
                                <Popover open={studentComboOpen} onOpenChange={setStudentComboOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={studentComboOpen}
                                            className="w-full justify-between"
                                        >
                                            {newBill.studentId
                                                ? students.find((s) => s.id === newBill.studentId)?.full_name
                                                : "ค้นหาหรือเลือกนักเรียน..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="พิมพ์เพื่อค้นหา..." />
                                            <CommandList>
                                                <CommandEmpty>ไม่พบข้อมูลนักเรียน</CommandEmpty>
                                                <CommandGroup>
                                                    {students.map((student) => (
                                                        <CommandItem
                                                            key={student.id}
                                                            value={`${student.full_name} ${student.nickname || ''}`}
                                                            onSelect={() => {
                                                                setNewBill({ ...newBill, studentId: student.id })
                                                                setStudentComboOpen(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    newBill.studentId === student.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {student.full_name}
                                                            {student.nickname && <span className="ml-2 text-muted-foreground text-xs">({student.nickname})</span>}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>เลือกแพ็คเกจ</Label>
                                <Select
                                    value={newBill.packageId}
                                    onValueChange={(val) => setNewBill({ ...newBill, packageId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกแพ็คเกจ..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} - {p.credits} เครดิต ({formatCurrency(p.price)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>ยกเลิก</Button>
                            <Button onClick={handleCreateBill}>บันทึกและสร้างบิล</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-l-4 border-l-yellow-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        บิลรอชำระ (Pending)
                        <span className="ml-auto text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                            {pendingBills.length} รายการ
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingBills.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ไม่มีรายการรอชำระ</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่สร้าง</TableHead>
                                    <TableHead>นักเรียน</TableHead>
                                    <TableHead>แพ็คเกจ</TableHead>
                                    <TableHead>ราคา</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingBills.map((bill) => (
                                    <TableRow key={bill.id}>
                                        <TableCell>{formatDateTime(bill.created_at)}</TableCell>
                                        <TableCell className="font-medium">
                                            {bill.students?.full_name}
                                            <span className="text-xs text-gray-500 ml-2">
                                                {bill.students?.nickname && `(${bill.students.nickname})`}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{bill.packages?.name}</div>
                                            <div className="text-xs text-gray-500">{bill.packages?.credits} เครดิต</div>
                                        </TableCell>
                                        <TableCell className="font-bold text-lg">
                                            {formatCurrency(bill.packages?.price || 0)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(bill.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkAsPaid(bill.id, bill.packages?.credits || 0)}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    อนุมัติ
                                                </Button>
                                            </div>
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
                    <CardTitle className="text-gray-700 flex justify-between items-center">
                        <div>ประวัติการชำระเงินล่าสุด</div>
                        <div className="text-sm font-normal text-gray-500">แสดง 10 รายการล่าสุด</div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>วันที่ชำระ</TableHead>
                                <TableHead>นักเรียน</TableHead>
                                <TableHead>แพ็คเกจ</TableHead>
                                <TableHead>ยอดชำระ</TableHead>
                                <TableHead>สถานะ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paidBills.slice(0, 10).map((bill) => (
                                <TableRow key={bill.id}>
                                    <TableCell>{formatDateTime(bill.app_paid_at || bill.created_at)}</TableCell>
                                    <TableCell>
                                        {bill.students?.full_name}
                                    </TableCell>
                                    <TableCell>{bill.packages?.name}</TableCell>
                                    <TableCell className="font-bold text-green-600">
                                        {formatCurrency(bill.packages?.price || 0)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            ชำระแล้ว
                                        </span>
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
