'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, UserCheck, Users } from 'lucide-react'
import Link from 'next/link'

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            ระบบจัดการ - ครู
                        </h1>
                        <Button onClick={handleLogout} variant="ghost" size="sm">
                            <LogOut className="h-4 w-4 mr-2" />
                            ออกจากระบบ
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="lg:col-span-1">
                        <nav className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                            <Link href="/teacher">
                                <Button variant="ghost" className="w-full justify-start">
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    เช็คชื่อ
                                </Button>
                            </Link>
                            <Link href="/teacher/attendance">
                                <Button variant="ghost" className="w-full justify-start">
                                    <Users className="h-4 w-4 mr-2" />
                                    ประวัติการเช็คชื่อ
                                </Button>
                            </Link>
                        </nav>
                    </aside>

                    <main className="lg:col-span-3">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
