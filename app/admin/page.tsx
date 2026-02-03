import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, FileText, DollarSign } from 'lucide-react'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Get statistics
    const [
        { count: packagesCount },
        { count: studentsCount },
        { count: pendingBillsCount },
        { data: paidBills },
    ] = await Promise.all([
        supabase.from('packages').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('purchases').select('*').eq('status', 'paid'),
    ])

    // Calculate total revenue
    const totalRevenue = paidBills?.reduce((sum: number, bill: any) => {
        return sum + (bill.package?.price || 0)
    }, 0) || 0

    const stats = [
        {
            title: 'แพ็คเกจทั้งหมด',
            value: packagesCount || 0,
            icon: Package,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            title: 'นักเรียนทั้งหมด',
            value: studentsCount || 0,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'บิลรอชำระ',
            value: pendingBillsCount || 0,
            icon: FileText,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
        },
        {
            title: 'รายได้รวม',
            value: `฿${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-50',
        },
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">ภาพรวมระบบ</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>การเริ่มต้นใช้งาน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-gray-600">• เพิ่มวิชาและสร้างแพ็คเกจเครดิตให้กับนักเรียน</p>
                    <p className="text-gray-600">• เพิ่มข้อมูลนักเรียนและผู้ปกครอง</p>
                    <p className="text-gray-600">• อนุมัติบิลการซื้อแพ็คเกจของนักเรียน</p>
                    <p className="text-gray-600">• ดูรายงานรายได้และการเข้าเรียน</p>
                </CardContent>
            </Card>
        </div>
    )
}
