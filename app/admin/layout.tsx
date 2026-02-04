import Sidebar from '@/components/admin/sidebar'
import MobileSidebar from '@/components/admin/mobile-sidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-full relative">
            {/* Desktop Sidebar */}
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="md:pl-72 pb-10">
                {/* Mobile Header */}
                <div className="flex items-center p-4 md:hidden bg-white shadow-md sticky top-0 z-50">
                    <MobileSidebar />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Logo" width={32} height={32} className="ml-3" />
                    <div className="font-bold text-lg ml-2 text-primary">Tutoring School</div>
                </div>

                {/* Page Content */}
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
