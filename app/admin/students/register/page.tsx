'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createParentAndStudent } from '@/app/actions/admin'
import { ArrowLeft, CheckCircle, Copy } from 'lucide-react'
import Link from 'next/link'

export default function AdminRegisterStudentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    // Parent Form
    const [parentEmail, setParentEmail] = useState('')
    const [parentName, setParentName] = useState('')
    const [parentPhone, setParentPhone] = useState('')

    // Student Form
    const [studentName, setStudentName] = useState('')
    const [studentNickname, setStudentNickname] = useState('')
    const [studentGrade, setStudentGrade] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const response = await createParentAndStudent({
            parentEmail,
            parentName,
            parentPhone,
            studentName,
            studentNickname,
            studentGrade
        })

        setLoading(false)
        if (response.success) {
            setResult(response)
        } else {
            alert(response.message)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        alert('คัดลอกเรียบร้อย')
    }

    if (result) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className="border-green-500 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center text-green-600 gap-2">
                            <CheckCircle className="h-6 w-6" />
                            ลงทะเบียนสำเร็จ
                        </CardTitle>
                        <CardDescription>
                            เพิ่มข้อมูลนักเรียนเข้าสู่ระบบเรียบร้อยแล้ว
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-green-50 p-4 rounded-lg space-y-2">
                            <p className="font-semibold text-green-800">ข้อมูลผู้ปกครอง</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span>อีเมล (Username):</span>
                                <span className="font-mono font-bold">{result.parentEmail}</span>

                                {result.isNewParent && (
                                    <>
                                        <span>รหัสผ่านเริ่มต้น:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-lg bg-white px-2 py-0.5 rounded border border-green-200">
                                                {result.parentPassword}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(`Email: ${result.parentEmail}\nPassword: ${result.parentPassword}`)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="col-span-2 text-xs text-green-600 mt-1">
                                            *กรุณาส่งรหัสผ่านนี้ให้ผู้ปกครอง
                                        </div>
                                    </>
                                )}
                                {!result.isNewParent && (
                                    <div className="col-span-2 text-xs text-blue-600 mt-1">
                                        *ผู้ปกครองท่านนี้มีบัญชีอยู่แล้ว สามารถใช้รหัสผ่านเดิมได้เลย
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => {
                                setResult(null)
                                setStudentName('')
                                setStudentNickname('')
                                setStudentGrade('')
                                // Keep parent info for adding sibling? Or clear all?
                                // Let's clear student info only to allow adding sibling easily
                            }}>
                                เพิ่มพี่น้อง/คนอื่นต่อ
                            </Button>
                            <Link href="/admin/students">
                                <Button>กลับหน้ารายชื่อ</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/students">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold text-primary">ลงทะเบียนนักเรียนใหม่</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ข้อมูลผู้ปกครอง & นักเรียน</CardTitle>
                    <CardDescription>
                        ระบบจะสร้างบัญชีผู้ปกครองให้อัตโนมัติ (ถ้ายังไม่มี)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Parent Section */}
                        <div className="space-y-4 border-b pb-6">
                            <h3 className="text-lg font-semibold text-gray-700">1. ข้อมูลผู้ปกครอง</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="parentEmail">อีเมล (ใช้สำหรับล็อกอิน) *</Label>
                                    <Input
                                        id="parentEmail"
                                        type="email"
                                        required
                                        placeholder="parent@email.com"
                                        value={parentEmail}
                                        onChange={(e) => setParentEmail(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">หากมีบัญชีแล้ว ระบบจะผูกนักเรียนใหม่ให้ทันที</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parentPhone">เบอร์โทรศัพท์ *</Label>
                                    <Input
                                        id="parentPhone"
                                        type="tel"
                                        required
                                        placeholder="0812345678"
                                        value={parentPhone}
                                        onChange={(e) => setParentPhone(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">จะใช้เป็นรหัสผ่านเริ่มต้น (กรณีสมัครใหม่)</p>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="parentName">ชื่อ-นามสกุล ผู้ปกครอง *</Label>
                                    <Input
                                        id="parentName"
                                        required
                                        placeholder="นาย รักลูก บูชาเรียน"
                                        value={parentName}
                                        onChange={(e) => setParentName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Student Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700">2. ข้อมูลนักเรียน</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="studentName">ชื่อ-นามสกุล นักเรียน *</Label>
                                    <Input
                                        id="studentName"
                                        required
                                        placeholder="ด.ช. ตั้งใจ เรียน"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studentNickname">ชื่อเล่น</Label>
                                    <Input
                                        id="studentNickname"
                                        placeholder="น้องเก่ง"
                                        value={studentNickname}
                                        onChange={(e) => setStudentNickname(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studentGrade">ระดับชั้น</Label>
                                    <Input
                                        id="studentGrade"
                                        placeholder="ป.4"
                                        value={studentGrade}
                                        onChange={(e) => setStudentGrade(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full md:w-auto min-w-[200px]" disabled={loading}>
                                {loading ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
