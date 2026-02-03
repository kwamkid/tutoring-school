import { getParentsWithChildren } from '@/app/actions/admin'
import ParentsTable from '@/components/admin/parents-table'

export default async function ManageParentsPage() {
    const parents = await getParentsWithChildren()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary">จัดการผู้ปกครอง</h2>
            </div>

            <ParentsTable parents={parents} />
        </div>
    )
}
