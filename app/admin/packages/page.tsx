'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { Package, Subject, PackageWithSubjects } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

export default function PackagesPage() {
    const [packages, setPackages] = useState<PackageWithSubjects[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        credits: '',
        price: '',
        selectedSubjects: [] as string[],
    })
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)

        // Load subjects
        const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .order('name')

        // Load packages with subjects
        const { data: packagesData } = await supabase
            .from('packages')
            .select('*')
            .order('created_at', { ascending: false })

        if (packagesData) {
            // Load package subjects
            const packagesWithSubjects = await Promise.all(
                packagesData.map(async (pkg) => {
                    const { data: pkgSubjects } = await supabase
                        .from('package_subjects')
                        .select('subject_id, subjects(*)')
                        .eq('package_id', pkg.id)

                    return {
                        ...pkg,
                        subjects: pkgSubjects?.map((ps: any) => ps.subjects).filter(Boolean) || []
                    }
                })
            )
            setPackages(packagesWithSubjects)
        }

        setSubjects(subjectsData || [])
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (editingId) {
                // Update package
                await supabase
                    .from('packages')
                    .update({
                        name: formData.name,
                        credits: parseInt(formData.credits),
                        price: parseFloat(formData.price),
                    })
                    .eq('id', editingId)

                // Delete old package_subjects
                await supabase
                    .from('package_subjects')
                    .delete()
                    .eq('package_id', editingId)

                // Insert new package_subjects
                if (formData.selectedSubjects.length > 0) {
                    await supabase
                        .from('package_subjects')
                        .insert(
                            formData.selectedSubjects.map(subjectId => ({
                                package_id: editingId,
                                subject_id: subjectId,
                            }))
                        )
                }
            } else {
                // Create new package
                const { data: newPackage } = await supabase
                    .from('packages')
                    .insert({
                        name: formData.name,
                        credits: parseInt(formData.credits),
                        price: parseFloat(formData.price),
                    })
                    .select()
                    .single()

                if (newPackage && formData.selectedSubjects.length > 0) {
                    await supabase
                        .from('package_subjects')
                        .insert(
                            formData.selectedSubjects.map(subjectId => ({
                                package_id: newPackage.id,
                                subject_id: subjectId,
                            }))
                        )
                }
            }

            setShowForm(false)
            setEditingId(null)
            setFormData({ name: '', credits: '', price: '', selectedSubjects: [] })
            loadData()
        } catch (error) {
            console.error('Error saving package:', error)
        }
    }

    const handleEdit = (pkg: PackageWithSubjects) => {
        setEditingId(pkg.id)
        setFormData({
            name: pkg.name,
            credits: pkg.credits.toString(),
            price: pkg.price.toString(),
            selectedSubjects: pkg.subjects?.map(s => s.id) || [],
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('ต้องการลบแพ็คเกจนี้?')) {
            await supabase.from('packages').delete().eq('id', id)
            loadData()
        }
    }

    const toggleSubject = (subjectId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedSubjects: prev.selectedSubjects.includes(subjectId)
                ? prev.selectedSubjects.filter(id => id !== subjectId)
                : [...prev.selectedSubjects, subjectId]
        }))
    }

    const handleCreateSubject = async () => {
        const name = prompt('ชื่อวิชา:')
        if (name) {
            await supabase.from('subjects').insert({ name })
            loadData()
        }
    }

    if (loading) {
        return <div>กำลังโหลด...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">จัดการแพ็คเกจ</h2>
                <div className="space-x-2">
                    <Button onClick={handleCreateSubject} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มวิชา
                    </Button>
                    <Button onClick={() => {
                        setShowForm(true)
                        setEditingId(null)
                        setFormData({ name: '', credits: '', price: '', selectedSubjects: [] })
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        สร้างแพ็คเกจ
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingId ? 'แก้ไขแพ็คเกจ' : 'สร้างแพ็คเกจใหม่'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="name">ชื่อแพ็คเกจ</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="เช่น แพ็คเกจพื้นฐาน"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="credits">จำนวนเครดิต</Label>
                                    <Input
                                        id="credits"
                                        type="number"
                                        min="1"
                                        value={formData.credits}
                                        onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                        placeholder="เช่น 10"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="price">ราคา (บาท)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="เช่น 1000"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>เลือกวิชาในแพ็คเกจ</Label>
                                <div className="mt-2 space-y-2">
                                    {subjects.map(subject => (
                                        <label key={subject.id} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.selectedSubjects.includes(subject.id)}
                                                onChange={() => toggleSubject(subject.id)}
                                                className="rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                            />
                                            <span>{subject.name}</span>
                                        </label>
                                    ))}
                                    {subjects.length === 0 && (
                                        <p className="text-sm text-gray-500">ยังไม่มีวิชา กรุณาเพิ่มวิชาก่อน</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => {
                                    setShowForm(false)
                                    setEditingId(null)
                                    setFormData({ name: '', credits: '', price: '', selectedSubjects: [] })
                                }}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit">
                                    {editingId ? 'บันทึกการแก้ไข' : 'สร้างแพ็คเกจ'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>รายการแพ็คเกจทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                    {packages.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ยังไม่มีแพ็คเกจ</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อแพ็คเกจ</TableHead>
                                    <TableHead>เครดิต</TableHead>
                                    <TableHead>ราคา</TableHead>
                                    <TableHead>วิชาในแพ็คเกจ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {packages.map((pkg) => (
                                    <TableRow key={pkg.id}>
                                        <TableCell className="font-medium">{pkg.name}</TableCell>
                                        <TableCell>{pkg.credits} เครดิต</TableCell>
                                        <TableCell>{formatCurrency(pkg.price)}</TableCell>
                                        <TableCell>
                                            {pkg.subjects && pkg.subjects.length > 0
                                                ? pkg.subjects.map(s => s.name).join(', ')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEdit(pkg)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(pkg.id)}>
                                                <Trash2 className="h-4 w-4" />
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
