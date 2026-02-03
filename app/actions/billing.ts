'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ... (Existing functions: createParentAndStudent, getParentsWithChildren)

export async function createBill(studentId: string, packageId: string) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase.from('purchases').insert({
            student_id: studentId,
            package_id: packageId,
            status: 'pending'
        })

        if (error) throw error

        revalidatePath('/admin/bills')
        return { success: true }
    } catch (error: any) {
        console.error('Create Bill Error:', error)
        return { success: false, message: error.message }
    }
}

export async function markBillAsPaid(billId: string) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('purchases')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', billId)

        if (error) throw error

        revalidatePath('/admin/bills')
        return { success: true }
    } catch (error: any) {
        console.error('Mark Paid Error:', error)
        return { success: false, message: error.message }
    }
}

export async function deleteBill(billId: string) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('purchases')
            .delete()
            .eq('id', billId)

        if (error) throw error

        revalidatePath('/admin/bills')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Bill Error:', error)
        return { success: false, message: error.message }
    }
}
