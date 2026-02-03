'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle
} from '@/components/ui/sheet'
import Sidebar from '@/components/admin/sidebar'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function MobileSidebar() {
    const [isMounted, setIsMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    if (!isMounted) {
        return null
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 text-white w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Sidebar />
            </SheetContent>
        </Sheet>
    )
}
