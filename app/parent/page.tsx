'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import StudentDashboardView from '@/components/student-dashboard-view'
import { User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ParentDashboardPage() {
    const [children, setChildren] = useState<any[]>([])
    const [selectedChild, setSelectedChild] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadChildren()
    }, [])

    const loadChildren = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('parent_id', user.id)
                .order('created_at', { ascending: true })

            if (data && data.length > 0) {
                setChildren(data)
                // Select first child by default
                setSelectedChild(data[0])
            }
        }
        setLoading(false)
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-primary">กำลังโหลดข้อมูล...</div>
    }

    // New Parent with no students
    if (children.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="bg-orange-100 p-4 rounded-full">
                    <Users className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-700">ยินดีต้อนรับผู้ปกครอง</h2>
                <p className="text-gray-500">ยังไม่พบข้อมูลนักเรียนในบัญชีของคุณ</p>
                <p className="text-sm text-gray-400">กรุณาติดต่อเจ้าหน้าที่เพื่อเพิ่มรายชื่อนักเรียน</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">ผู้ปกครอง: เลือกดูข้อมูลนักเรียน</h1>

            {/* Child Selector */}
            {children.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {children.map((child) => (
                        <Card
                            key={child.id}
                            className={cn(
                                "cursor-pointer transition-all hover:scale-105",
                                selectedChild?.id === child.id
                                    ? "border-2 border-primary bg-orange-50 shadow-md"
                                    : "hover:bg-gray-50"
                            )}
                            onClick={() => setSelectedChild(child)}
                        >
                            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                <div className={cn(
                                    "p-3 rounded-full",
                                    selectedChild?.id === child.id ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                                )}>
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{child.full_name}</p>
                                    <p className="text-xs text-gray-500">{child.nickname || 'ไม่มีชื่อเล่น'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Selected Child Dashboard */}
            {selectedChild ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StudentDashboardView
                        studentId={selectedChild.id}
                        studentName={selectedChild.nickname || selectedChild.full_name}
                    />
                </div>
            ) : (
                <div className="text-center py-12 text-gray-400">
                    กรุณาเลือกนักเรียนเพื่อดูข้อมูล
                </div>
            )}
        </div>
    )
}
