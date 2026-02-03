'use client'

import React, { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ChevronDown, ChevronRight, User, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { updateParent } from '@/app/actions/admin'

type ParentWithChildren = {
    id: string
    email: string | undefined
    phone: string
    secondary_phone?: string
    address?: string
    full_name: string
    children: any[]
}

export default function ParentsTable({ parents }: { parents: ParentWithChildren[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [selectedParent, setSelectedParent] = useState<ParentWithChildren | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})

    const toggleRow = (parentId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(parentId)) {
            newExpanded.delete(parentId)
        } else {
            newExpanded.add(parentId)
        }
        setExpandedRows(newExpanded)
    }

    const filteredParents = parents.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.phone.includes(searchTerm)
    )

    const handleEditClick = (parent: ParentWithChildren, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row toggle
        setSelectedParent(parent)
        setEditForm({
            full_name: parent.full_name,
            phone: parent.phone,
            secondary_phone: parent.secondary_phone,
            address: parent.address,
        })
        setIsEditing(true)
    }

    const handleSave = async () => {
        if (!selectedParent) return

        const res = await updateParent(selectedParent.id, {
            full_name: editForm.full_name,
            phone: editForm.phone,
            secondary_phone: editForm.secondary_phone,
            address: editForm.address,
        })

        if (!res.success) {
            alert('เกิดข้อผิดพลาด: ' + res.message)
            return
        }

        alert('บันทึกข้อมูลเรียบร้อย')
        setIsEditing(false)
        setSelectedParent(null)
        // Server Action calls revalidatePath, so data should refresh on next render or navigation event, 
        // but for client-side immediate feedback we might want to reload or update local state if we were passing state down.
        // Since we receive 'parents' as prop from server component page, Next.js should handle the refresh automatically.
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>รายชื่อผู้ปกครองทั้งหมด ({parents.length})</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>ชื่อ-นามสกุล</TableHead>
                                    <TableHead>อีเมล (Username)</TableHead>
                                    <TableHead>เบอร์โทรศัพท์</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredParents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            ไม่พบข้อมูลผู้ปกครอง
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredParents.map((parent) => (
                                        <React.Fragment key={parent.id}>
                                            <TableRow
                                                className={cn("cursor-pointer hover:bg-muted/50 transition-colors", expandedRows.has(parent.id) && "bg-muted/50 border-b-0")}
                                                onClick={() => toggleRow(parent.id)}
                                            >
                                                <TableCell>
                                                    {expandedRows.has(parent.id) ? (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium text-primary">
                                                    {parent.full_name}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{parent.email}</TableCell>
                                                <TableCell>
                                                    <div>{parent.phone}</div>
                                                    {parent.secondary_phone && <div className="text-xs text-muted-foreground">สำรอง: {parent.secondary_phone}</div>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={(e) => handleEditClick(parent, e)}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            {expandedRows.has(parent.id) && (
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableCell colSpan={5} className="p-0 border-t-0">
                                                        <div className="p-4 pl-12 space-y-2">
                                                            <div className="mb-4 text-sm text-gray-600">
                                                                <span className="font-semibold mr-2">ที่อยู่:</span>
                                                                {parent.address || '-'}
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                                                <User className="h-4 w-4" />
                                                                รายชื่อนักเรียนในความดูแล
                                                            </h4>
                                                            {parent.children.length > 0 ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {parent.children.map((child: any) => (
                                                                        <div key={child.id} className="bg-white p-3 rounded border shadow-sm flex justify-between items-center">
                                                                            <div>
                                                                                <p className="font-medium">{child.full_name}</p>
                                                                                <p className="text-xs text-gray-500">ชื่อเล่น: {child.nickname || '-'}</p>
                                                                            </div>
                                                                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                                                {child.grade || 'ไม่ระบุชั้น'}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-400 italic">ยังไม่มีข้อมูลนักเรียน</p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>แก้ไขข้อมูลผู้ปกครอง</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>ชื่อ-นามสกุล</Label>
                            <Input
                                value={editForm.full_name || ''}
                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรศัพท์</Label>
                            <Input
                                value={editForm.phone || ''}
                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรสำรอง</Label>
                            <Input
                                value={editForm.secondary_phone || ''}
                                onChange={e => setEditForm({ ...editForm, secondary_phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ที่อยู่</Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={editForm.address || ''}
                                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>ยกเลิก</Button>
                        <Button onClick={handleSave}>บันทึก</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
