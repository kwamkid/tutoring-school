'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, Home, ShoppingCart, History } from 'lucide-react'
import Link from 'next/link'

export default function StudentLayout({
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
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            ระบบจัดการ - นักเรียน
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
                            <Link href="/student">
                                <Button variant="ghost" className="w-full justify-start">
                                    <Home className="h-4 w-4 mr-2" />
                                    แดชบอร์ด
                                </Button>
                            </Link>
                            <Link href="/student/purchase">
                                <Button variant="ghost" className="w-full justify-start">
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    ซื้อแพ็คเกจ
                                </Button>
                            </Link>
                            <Link href="/student/history">
                                <Button variant="ghost" className="w-full justify-start">
                                    <History className="h-4 w-4 mr-2" />
                                    ประวัติ
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
