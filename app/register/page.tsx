'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { UserRole } from '@/types/database'

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'student' as UserRole,
        parentName: '',
        parentPhone: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน')
            setLoading(false)
            return
        }

        try {
            // Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: formData.role,
                        parent_name: formData.role === 'student' ? formData.parentName : null,
                        parent_phone: formData.role === 'student' ? formData.parentPhone : null,
                    },
                },
            })

            if (authError) throw authError

            if (authData.user) {
                // Create profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        full_name: formData.fullName,
                        role: formData.role,
                    })

                if (profileError) throw profileError

                // Create student record if role is student
                if (formData.role === 'student') {
                    const { error: studentError } = await supabase
                        .from('students')
                        .insert({
                            user_id: authData.user.id,
                            parent_name: formData.parentName || null,
                            parent_phone: formData.parentPhone || null,
                        })

                    if (studentError) throw studentError
                }

                router.push('/login')
            }
        } catch (error: any) {
            setError(error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold text-center text-primary">
                        สมัครสมาชิก
                    </CardTitle>
                    <CardDescription className="text-center">
                        สร้างบัญชีใหม่เพื่อเริ่มใช้งาน
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="เช่น สมชาย ใจดี"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">รหัสผ่าน</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="อย่างน้อย 6 ตัวอักษร"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">ประเภทผู้ใช้</Label>
                            <Select
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                disabled={loading}
                            >
                                <option value="student">นักเรียน/ผู้ปกครอง</option>
                                <option value="teacher">ครู</option>
                                <option value="admin">แอดมิน</option>
                            </Select>
                        </div>
                        {formData.role === 'student' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="parentName">ชื่อผู้ปกครอง (ถ้ามี)</Label>
                                    <Input
                                        id="parentName"
                                        type="text"
                                        placeholder="ชื่อผู้ปกครอง"
                                        value={formData.parentName}
                                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parentPhone">เบอร์โทรผู้ปกครอง (ถ้ามี)</Label>
                                    <Input
                                        id="parentPhone"
                                        type="tel"
                                        placeholder="0812345678"
                                        value={formData.parentPhone}
                                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                                        disabled={loading}
                                    />
                                </div>
                            </>
                        )}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm text-gray-600">
                        มีบัญชีอยู่แล้ว?{' '}
                        <Link href="/login" className="text-primary hover:underline font-medium">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
