import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. กำหนดเส้นทางที่ไม่ต้องตรวจสอบสิทธิ์ (Public Routes)
    if (pathname === '/login' || pathname === '/register' || pathname === '/') {
        return NextResponse.next()
    }

    // 2. สร้าง Supabase Client และรับ Response กลับมาเพื่อจัดการ Cookie
    const { supabase, response } = await createClient(request)

    // 3. ตรวจสอบสถานะ User (ใช้ getUser เพื่อความปลอดภัยในระดับ Server)
    const { data: { user } } = await supabase.auth.getUser()

    // กรณีไม่มี User ให้ Redirect ไปหน้า Login
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 4. ตรวจสอบ Role จาก Table Profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // ถ้าไม่มีข้อมูล Profile ให้กลับไป Login ใหม่
    if (!profile) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 5. การควบคุมการเข้าถึงตามบทบาท (Role-based Access Control)
    // ตรวจสอบหน้า Admin
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ตรวจสอบหน้า Teacher (Admin เข้าได้)
    if (pathname.startsWith('/teacher') && profile.role !== 'teacher' && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ตรวจสอบหน้า Student (Role อื่นที่ไม่ใช่ student และไม่ใช่อาจารย์/แอดมินที่มาดูข้อมูล ให้ไปหน้า dashboard)
    if (pathname.startsWith('/student') && profile.role !== 'student' && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // คืนค่า response ที่มีการจัดการ cookie เรียบร้อยแล้ว
    return response
}

export const config = {
    // กำหนด matcher เพื่อข้ามไฟล์ static ต่างๆ เพื่อความเร็วในการทำงาน
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}