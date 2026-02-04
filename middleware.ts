import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // 1. สร้าง Supabase Client ผ่าน helper ที่เราเตรียมไว้ (จัดการเรื่อง Cookie ให้อัตโนมัติ)
    const { supabase, response } = await createClient(request)

    // 2. ดึงข้อมูล User (แนะนำใช้ getUser() เพราะปลอดภัยกว่าบน Server/Middleware)
    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // 3. กำหนดเส้นทางที่ไม่ต้องตรวจสอบสิทธิ์ (Public Routes)
    const publicPaths = ['/login', '/register', '/']
    const isPublicPath = publicPaths.includes(pathname)

    // กรณีไม่มี User และพยายามเข้าหน้าอื่นที่ไม่ใช่ Public
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 4. กรณีมี User แล้ว (ตรวจสอบ Role-based Access)
    if (user) {
        // ถ้าล็อกอินแล้วและพยายามจะไปหน้า Login/Register ให้เด้งไป Dashboard
        if (isPublicPath && pathname !== '/') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // ดึงโปรไฟล์เพื่อเช็ค Role (ดึงจาก table 'profiles')
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            // กรณีไม่มีโปรไฟล์ในระบบ (อาจจะเพิ่งสมัครแต่ DB พัง)
            if (pathname !== '/login') {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return NextResponse.redirect(url)
            }
        } else {
            const role = profile.role

            // ป้องกันการเข้าหน้าข้าม Role
            if (pathname.startsWith('/admin') && role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            if (pathname.startsWith('/parent') && role !== 'parent' && role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    // สำคัญ: ต้องคืนค่า response ที่มาจาก createClient เพื่อให้ Cookie ถูกส่งกลับไปที่ Browser
    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public images/assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}