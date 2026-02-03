import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login')
    }

    // Redirect based on role
    switch (profile.role) {
        case 'admin':
            redirect('/admin')
        case 'teacher':
            redirect('/teacher')
        case 'student':
            redirect('/student')
        case 'parent':
            redirect('/parent')
        default:
            redirect('/login')
    }
}
