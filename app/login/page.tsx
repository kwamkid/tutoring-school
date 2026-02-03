'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            if (data.user) {
                // Get user role to redirect accordingly
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single()

                if (profile) {
                    router.push('/dashboard')
                    router.refresh()
                }
            }
        } catch (error: any) {
            setError(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold text-center text-primary">
                        ระบบจัดการโรงเรียนสอนพิเศษ
                    </CardTitle>
                    <CardDescription className="text-center">
                        เข้าสู่ระบบเพื่อดำเนินการต่อ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">รหัสผ่าน</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
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
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm text-gray-600">
                        ยังไม่มีบัญชี?{' '}
                        <Link href="/register" className="text-primary hover:underline font-medium">
                            สมัครสมาชิก
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
