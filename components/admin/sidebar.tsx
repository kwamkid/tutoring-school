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
    UserCog
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
        label: 'จัดการบิล',
        icon: FileText,
        href: '/admin/bills',
        color: 'text-emerald-500',
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
        <div className="space-y-4 py-4 flex flex-col h-full bg-white border-r">
            <div className="px-3 py-2 flex-1">
                <Link href="/admin" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Logo placeholder - using a simple circle for now */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-bold">
                            TS
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-primary">
                        Tutoring School
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-orange-50 rounded-lg transition",
                                pathname === route.href ? "text-primary bg-orange-50" : "text-zinc-600"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2 border-t">
                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-zinc-600 hover:text-red-500 hover:bg-red-50"
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    ออกจากระบบ
                </Button>
            </div>
        </div>
    )
}
