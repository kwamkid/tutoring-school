'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    BookOpen,
    Package,
    Users,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    UserCog,
    GraduationCap,
    ClipboardCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const routes = [
    {
        label: 'ภาพรวม',
        icon: LayoutDashboard,
        href: '/admin',
        color: 'text-sky-500',
    },
    {
        label: 'จัดการวิชา',
        icon: BookOpen,
        href: '/admin/subjects',
        color: 'text-violet-500',
    },
    {
        label: 'จัดการแพ็คเกจ',
        icon: Package,
        href: '/admin/packages',
        color: 'text-pink-700',
    },
    {
        label: 'จัดการนักเรียน',
        icon: Users,
        href: '/admin/students',
        color: 'text-orange-700',
    },
    {
        label: 'จัดการผู้ปกครอง',
        icon: UserCog,
        href: '/admin/parents',
        color: 'text-rose-600',
    },
    {
        label: 'เช็คชื่อ/ลงเวลา',
        icon: ClipboardCheck,
        href: '/admin/attendance',
        color: 'text-teal-600',
    },
    {
        label: 'จัดการบิล',
        icon: FileText,
        href: '/admin/bills',
        color: 'text-emerald-500',
    },
    {
        label: 'บุคลากร',
        icon: Users, // Or Shield/GraduationCap if imported
        href: '/admin/users',
        color: 'text-purple-600',
    },
    {
        label: 'รายงาน',
        icon: BarChart3,
        href: '/admin/reports',
        color: 'text-blue-700',
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div
            className="space-y-4 py-6 flex flex-col h-full"
            style={{ background: 'linear-gradient(to bottom, #F0743E, #D4572A)' }}
        >
            <div className="px-4 py-2 flex-1">
                <Link href="/admin" className="flex items-center pl-3 mb-10">
                    <div className="relative w-10 h-10 mr-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg">
                            TS
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        Tutoring School
                    </h1>
                </Link>
                <div className="space-y-2 px-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-base group flex p-3 px-4 w-full justify-start font-medium cursor-pointer rounded-xl transition-all duration-200",
                                pathname === route.href
                                    ? "bg-white shadow-md"
                                    : "text-white/80 hover:bg-white/15 hover:text-white"
                            )}
                            style={pathname === route.href ? { color: '#D4572A' } : undefined}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn(
                                    "h-5 w-5 mr-3",
                                    pathname === route.href ? "" : "text-white/70"
                                )}
                                    style={pathname === route.href ? { color: '#F0743E' } : undefined}
                                />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-4 py-2">
                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-base text-white/70 hover:text-white hover:bg-white/15"
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    ออกจากระบบ
                </Button>
            </div>
        </div>
    )
}
