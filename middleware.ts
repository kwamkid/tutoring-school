import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes
    if (pathname === '/login' || pathname === '/register' || pathname === '/') {
        return NextResponse.next()
    }

    const { supabase, response } = await createClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    // Not authenticated
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role-based access control
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/teacher') && profile.role !== 'teacher' && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/student') && profile.role !== 'student') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
