'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createParentAndStudent(formData: {
    parentEmail: string
    parentName: string
    parentPhone: string
    studentName: string
    studentNickname?: string
    studentGrade?: string
}) {
    const supabase = createAdminClient()

    try {
        let parentId: string
        let parentPassword = null

        // 1. Check if parent exists
        const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers()
        if (searchError) throw searchError

        const existingParent = users.find(u => u.email === formData.parentEmail)

        if (existingParent) {
            parentId = existingParent.id
            // Update parent profile name/phone if needed? 
            // For now, assume existing parent is fine.
        } else {
            // 2. Create new parent
            // Generate a random password if not provided (or we could set a default one)
            // Let's use phone number as initial password for convenience, or random 6 digits
            const tempPassword = formData.parentPhone || Math.random().toString(36).slice(-8)

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: formData.parentEmail,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: formData.parentName,
                    role: 'parent',
                    phone: formData.parentPhone
                }
            })

            if (createError) throw createError
            if (!newUser.user) throw new Error('Failed to create parent user')

            parentId = newUser.user.id
            parentPassword = tempPassword

            // Create Profile for Parent
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: parentId,
                    full_name: formData.parentName,
                    role: 'parent'
                })

            if (profileError) throw profileError
        }

        // 3. Create Student linked to Parent
        const { error: studentError } = await supabase
            .from('students')
            .insert({
                parent_id: parentId,
                full_name: formData.studentName,
                nickname: formData.studentNickname || null,
                grade: formData.studentGrade || null
            })

        if (studentError) throw studentError

        revalidatePath('/admin/students')

        return {
            success: true,
            isNewParent: !!parentPassword,
            parentEmail: formData.parentEmail,
            parentPassword: parentPassword, // Only available if new user
            message: 'ลงทะเบียนสำเร็จ'
        }

    } catch (error: any) {
        console.error('Registration Error:', error)
        return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
        }
    }
}

export async function getParentsWithChildren() {
    const supabase = createAdminClient()

    try {
        // 1. Fetch all 'parent' users from Auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
        if (authError) throw authError

        const parents = users.filter(u => u.user_metadata.role === 'parent')

        if (parents.length === 0) return []

        const parentIds = parents.map(u => u.id)

        // 2. Fetch children for these parents
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('*')
            .in('parent_id', parentIds)

        if (studentError) throw studentError

        // 3. Combine Data
        const parentsWithChildren = parents.map(parent => {
            const children = students?.filter(s => s.parent_id === parent.id) || []
            return {
                id: parent.id,
                email: parent.email,
                phone: parent.user_metadata.phone || '-',
                full_name: parent.user_metadata.full_name || 'ไม่ระบุชื่อ',
                children: children
            }
        })

        return parentsWithChildren

    } catch (error) {
        console.error('Error fetching parents:', error)
        return []
    }
}

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

export async function updateStudent(studentId: string, data: {
    full_name?: string
    nickname?: string
    grade?: string
    school_name?: string
    birthdate?: string
    emergency_contact?: string
}) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('students')
            .update(data)
            .eq('id', studentId)

        if (error) throw error

        revalidatePath('/admin/students')
        return { success: true }
    } catch (error: any) {
        console.error('Update Student Error:', error)
        return { success: false, message: error.message }
    }
}

export async function updateParent(parentId: string, data: {
    full_name?: string
    phone?: string
    secondary_phone?: string
    address?: string
    email?: string // Changing email is tricky with Supabase Auth, but we can try updating metadata at least
}) {
    const supabase = createAdminClient()

    try {
        // 1. Update Profile in 'profiles' table
        const profileUpdateData: any = {}
        if (data.full_name) profileUpdateData.full_name = data.full_name
        if (data.phone) profileUpdateData.phone = data.phone
        if (data.secondary_phone) profileUpdateData.secondary_phone = data.secondary_phone
        if (data.address) profileUpdateData.address = data.address

        if (Object.keys(profileUpdateData).length > 0) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdateData)
                .eq('id', parentId)

            if (profileError) throw profileError
        }

        // 2. Update Auth User Metadata (to keep sync)
        if (data.full_name || data.phone || data.email) {
            const updateAttrs: any = {
                user_metadata: {}
            }
            if (data.full_name) updateAttrs.user_metadata.full_name = data.full_name
            if (data.phone) updateAttrs.user_metadata.phone = data.phone

            // Only admin can change email via updateUser
            if (data.email) updateAttrs.email = data.email

            const { error: authError } = await supabase.auth.admin.updateUserById(
                parentId,
                updateAttrs
            )

            if (authError) throw authError
        }

        revalidatePath('/admin/parents')
        revalidatePath('/admin/students') // Because students list shows parent info
        return { success: true }
    } catch (error: any) {
        console.error('Update Parent Error:', error)
        return { success: false, message: error.message }
    }
}

export async function createStaff(formData: {
    email: string
    name: string
    role: 'teacher' | 'admin'
    password?: string
}) {
    const supabase = createAdminClient()

    try {
        const tempPassword = formData.password || Math.random().toString(36).slice(-8)

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: formData.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                full_name: formData.name,
                role: formData.role
            }
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('Failed to create user')

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: newUser.user.id,
                full_name: formData.name,
                role: formData.role
            })

        if (profileError) throw profileError

        revalidatePath('/admin/users')

        return {
            success: true,
            email: formData.email,
            password: tempPassword,
            message: `สร้างบัญชีสถานะ ${formData.role} สำเร็จ`
        }

    } catch (error: any) {
        console.error('Create Staff Error:', error)
        return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการสร้างบัญชี'
        }
    }
}

export async function deleteStaff(userId: string) {
    const supabase = createAdminClient()

    try {
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) throw error

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Staff Error:', error)
        return { success: false, message: error.message }
    }
}
