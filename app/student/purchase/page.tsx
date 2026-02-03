'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Package, CheckCircle } from 'lucide-react'

export default function PurchasePage() {
    const [packages, setPackages] = useState<any[]>([])
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Get student record
            const { data: studentData } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (studentData) {
                setStudentId(studentData.id)
            }

            // Load active packages with subjects
            const { data: packagesData } = await supabase
                .from('packages')
                .select('*')
                .eq('is_active', true)
                .order('price')

            if (packagesData) {
                // Load subjects for each package
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
        }
        setLoading(false)
    }

    const handlePurchase = async (packageId: string) => {
        setPurchasing(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('purchases')
                .insert({
                    student_id: studentId,
                    package_id: packageId,
                    status: 'pending',
                })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'สั่งซื้อสำเร็จ! กรุณารอแอดมินอนุมัติการชำระเงิน'
            })
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'เกิดข้อผิดพลาด'
            })
        } finally {
            setPurchasing(false)
        }
    }

    if (loading) {
        return <div>กำลังโหลด...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">ซื้อแพ็คเกจ</h2>

            {message && (
                <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <CheckCircle className="h-5 w-5" />
                    <span>{message.text}</span>
                </div>
            )}

            {packages.length === 0 ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-gray-500">ยังไม่มีแพ็คเกจให้บริการ</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {packages.map((pkg) => (
                        <Card key={pkg.id} className="hover:shadow-lg transition-all border-2 hover:border-purple-300">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-6 w-6 text-purple-600" />
                                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-purple-600">
                                            {formatCurrency(pkg.price)}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b">
                                        <span className="text-gray-600">จำนวนเครดิต</span>
                                        <span className="text-2xl font-bold text-purple-600">
                                            {pkg.credits} เครดิต
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">วิชาในแพ็คเกจ:</h4>
                                        {pkg.subjects && pkg.subjects.length > 0 ? (
                                            <ul className="space-y-1">
                                                {pkg.subjects.map((subject: any) => (
                                                    <li key={subject.id} className="flex items-center gap-2 text-sm">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span>{subject.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">ไม่มีวิชาในแพ็คเกจ</p>
                                        )}
                                    </div>

                                    <Button
                                        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                        onClick={() => handlePurchase(pkg.id)}
                                        disabled={purchasing}
                                    >
                                        {purchasing ? 'กำลังสั่งซื้อ...' : 'สั่งซื้อแพ็คเกจนี้'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
