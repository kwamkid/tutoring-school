'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'
import { recordAttendance, cancelAttendance } from '@/app/actions/attendance'
import {
    Search,
    XCircle,
    History,
    ClipboardList,
    CheckCircle2,
    User,
    AlertCircle,
} from 'lucide-react'

interface CheckInViewProps {
    canCancel?: boolean
}

export default function CheckInView({ canCancel = false }: CheckInViewProps) {
    const [currentUser, setCurrentUser] = useState<any>(null)
    const supabase = createClient()

    // ===== Check-in State =====
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
    const [studentsWithCredits, setStudentsWithCredits] = useState<any[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    const [openStudentSearch, setOpenStudentSearch] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [note, setNote] = useState('')

    // ===== Attendance History State =====
    const [attendance, setAttendance] = useState<any[]>([])
    const [loadingAttendance, setLoadingAttendance] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubjectId, setFilterSubjectId] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const perPage = 30

    // ===== Cancel Dialog State =====
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [cancelTarget, setCancelTarget] = useState<any>(null)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelling, setCancelling] = useState(false)

    // ===== Logs Dialog State =====
    const [logsDialogOpen, setLogsDialogOpen] = useState(false)
    const [logs, setLogs] = useState<any[]>([])
    const [logsTarget, setLogsTarget] = useState<any>(null)
    const [loadingLogs, setLoadingLogs] = useState(false)

    // ===== Init =====
    useEffect(() => {
        loadCurrentUser()
        loadSubjects()
        loadAttendance()
    }, [])

    useEffect(() => {
        if (selectedSubjectId) {
            setSelectedStudent(null)
            loadStudentsForSubject(selectedSubjectId)
        } else {
            setStudentsWithCredits([])
            setSelectedStudent(null)
        }
    }, [selectedSubjectId])

    const loadCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
    }

    // ===== Check-in Functions =====
    const loadSubjects = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('subjects')
            .select('id, name')
            .order('name')

        setSubjects(data || [])
        setLoading(false)
    }

    const loadStudentsForSubject = async (subjectId: string) => {
        setLoadingStudents(true)
        const { data } = await supabase
            .rpc('get_students_with_credits_for_subject', { p_subject_id: subjectId })

        const formatted = (data || []).map((row: any) => ({
            id: row.student_id,
            full_name: row.full_name,
            nickname: row.nickname,
            credits_remaining: row.total_credits,
        }))

        setStudentsWithCredits(formatted)
        setLoadingStudents(false)
    }

    const handleCheckIn = async () => {
        if (!selectedStudent || !selectedSubjectId || !currentUser) return

        setSubmitting(true)

        const res = await recordAttendance({
            student_id: selectedStudent.id,
            subject_id: selectedSubjectId,
            teacher_id: currentUser.id,
            credits_used: 1,
            notes: note
        })

        if (res.success) {
            alert('เช็คชื่อสำเร็จ')
            setSelectedStudent(null)
            setNote('')
            loadStudentsForSubject(selectedSubjectId)
            const actualSubjectFilter = filterSubjectId === 'all' ? '' : filterSubjectId
            await loadAttendance(currentPage, searchQuery, actualSubjectFilter)
        } else {
            alert('เกิดข้อผิดพลาด: ' + res.message)
        }
        setSubmitting(false)
    }

    // ===== Attendance History Functions =====
    const loadAttendance = async (page = currentPage, search = searchQuery, subjectFilter = filterSubjectId) => {
        setLoadingAttendance(true)
        const { data } = await supabase
            .rpc('search_attendance', {
                p_search: search || null,
                p_subject_id: subjectFilter || null,
                p_page: page,
                p_per_page: perPage,
            })

        const rows = data || []
        setAttendance(rows)
        setTotalCount(rows.length > 0 ? Number(rows[0].total_count) : 0)
        setLoadingAttendance(false)
    }

    // ===== Cancel Functions =====
    const handleOpenCancel = (att: any) => {
        setCancelTarget(att)
        setCancelReason('')
        setCancelDialogOpen(true)
    }

    const handleConfirmCancel = async () => {
        if (!cancelTarget || !currentUser) return
        setCancelling(true)

        const res = await cancelAttendance({
            attendance_id: cancelTarget.id,
            cancelled_by: currentUser.id,
            reason: cancelReason || undefined
        })

        if (res.success) {
            setCancelDialogOpen(false)
            setCancelTarget(null)
            const actualSubjectFilter = filterSubjectId === 'all' ? '' : filterSubjectId
            await loadAttendance(currentPage, searchQuery, actualSubjectFilter)
        } else {
            alert('เกิดข้อผิดพลาด: ' + res.message)
        }
        setCancelling(false)
    }

    // ===== Logs Functions =====
    const handleViewLogs = async (att: any) => {
        setLogsTarget(att)
        setLogsDialogOpen(true)
        setLoadingLogs(true)

        const { data } = await supabase
            .from('attendance_logs')
            .select('*, profiles:performed_by(full_name)')
            .eq('attendance_id', att.id)
            .order('created_at', { ascending: true })

        setLogs(data || [])
        setLoadingLogs(false)
    }

    // Debounced search: reload when search/filter changes
    useEffect(() => {
        const actualSubjectFilter = filterSubjectId === 'all' ? '' : filterSubjectId
        const timer = setTimeout(() => {
            setCurrentPage(1)
            loadAttendance(1, searchQuery, actualSubjectFilter)
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery, filterSubjectId])

    const totalPages = Math.ceil(totalCount / perPage)

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        const actualSubjectFilter = filterSubjectId === 'all' ? '' : filterSubjectId
        loadAttendance(page, searchQuery, actualSubjectFilter)
    }

    return (
        <div className="space-y-6">
            {/* ===== Check-in Form ===== */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        บันทึกการเข้าเรียน
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Col 1: Subject */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">วิชา</Label>
                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกวิชา..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Col 2: Student */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">นักเรียน</Label>
                            {!selectedSubjectId ? (
                                <Button variant="outline" className="w-full justify-start text-muted-foreground" disabled>
                                    เลือกวิชาก่อน...
                                </Button>
                            ) : loadingStudents ? (
                                <Button variant="outline" className="w-full justify-start text-muted-foreground" disabled>
                                    กำลังโหลด...
                                </Button>
                            ) : studentsWithCredits.length > 0 ? (
                                <Popover open={openStudentSearch} onOpenChange={setOpenStudentSearch}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openStudentSearch}
                                            className="w-full justify-between"
                                        >
                                            <span className="truncate">
                                                {selectedStudent
                                                    ? `${selectedStudent.full_name} ${selectedStudent.nickname ? `(${selectedStudent.nickname})` : ''}`
                                                    : "ค้นหาชื่อนักเรียน..."}
                                            </span>
                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-75 p-0">
                                        <Command>
                                            <CommandInput placeholder="พิมพ์ชื่อเล่น หรือ ชื่อจริง..." />
                                            <CommandList>
                                                <CommandEmpty>ไม่พบรายชื่อนักเรียน</CommandEmpty>
                                                <CommandGroup>
                                                    {studentsWithCredits.map((student) => (
                                                        <CommandItem
                                                            key={student.id}
                                                            value={`${student.full_name} ${student.nickname || ''}`}
                                                            onSelect={() => {
                                                                setSelectedStudent(student)
                                                                setOpenStudentSearch(false)
                                                            }}
                                                        >
                                                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            {student.full_name}
                                                            {student.nickname && <span className="ml-1 text-muted-foreground">({student.nickname})</span>}
                                                            <span className="ml-auto text-xs text-blue-600 font-medium">
                                                                {student.credits_remaining} เครดิต
                                                            </span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <Button variant="outline" className="w-full justify-start text-yellow-700 border-yellow-300 bg-yellow-50" disabled>
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    ไม่มีนักเรียนที่มีเครดิต
                                </Button>
                            )}
                        </div>

                        {/* Col 3: Note */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">หมายเหตุ</Label>
                            <Input
                                placeholder="เช่น มาสาย, ลืมหนังสือ..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Bottom row: Credit badge + Submit button */}
                    <div className="flex items-center gap-4 mt-4">
                        {selectedStudent && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-900 rounded-md border border-blue-100">
                                <span className="text-sm font-medium">เครดิตคงเหลือ:</span>
                                <span className="text-lg font-bold">{selectedStudent.credits_remaining}</span>
                            </div>
                        )}
                        <Button
                            className="ml-auto"
                            disabled={!selectedStudent || !selectedSubjectId || submitting}
                            onClick={handleCheckIn}
                        >
                            {submitting ? 'กำลังบันทึก...' : 'ยืนยันการเช็คชื่อ'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ===== Attendance History Table ===== */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        ประวัติการเช็คชื่อ
                        {totalCount > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                ({totalCount.toLocaleString()} รายการ)
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="ค้นหาชื่อนักเรียน, ชื่อเล่น, ชื่อผู้ปกครอง, เบอร์โทร..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
                            <SelectTrigger className="w-full sm:w-50">
                                <SelectValue placeholder="ทุกวิชา" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกวิชา</SelectItem>
                                {subjects.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingAttendance ? (
                        <p className="text-center text-gray-500 py-8">กำลังโหลด...</p>
                    ) : attendance.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ไม่พบรายการเช็คชื่อ</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วันที่/เวลา</TableHead>
                                        <TableHead>นักเรียน</TableHead>
                                        <TableHead>วิชา</TableHead>
                                        <TableHead>เครดิต</TableHead>
                                        <TableHead>ผู้เช็ค</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead>หมายเหตุ</TableHead>
                                        {canCancel && (
                                            <TableHead className="text-right">จัดการ</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendance.map((att) => (
                                        <TableRow
                                            key={att.id}
                                            className={att.status === 'cancelled' ? 'opacity-50 bg-red-50' : ''}
                                        >
                                            <TableCell className="whitespace-nowrap">
                                                {formatDateTime(att.checked_at)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {att.student_full_name || '-'}
                                                {att.student_nickname && (
                                                    <span className="text-muted-foreground ml-1">
                                                        ({att.student_nickname})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                                    style={{ backgroundColor: att.subject_color || '#6B7280' }}
                                                >
                                                    {att.subject_name || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{att.credits_used}</TableCell>
                                            <TableCell>{att.teacher_full_name || '-'}</TableCell>
                                            <TableCell>
                                                {att.status === 'active' ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                                        เรียนแล้ว
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        ยกเลิก
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 max-w-[150px] truncate">
                                                {att.notes || '-'}
                                            </TableCell>
                                            {canCancel && (
                                                <TableCell className="text-right space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleViewLogs(att)}
                                                        title="ดู Log"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    {att.status === 'active' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleOpenCancel(att)}
                                                            title="ยกเลิกการเช็คชื่อ"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                หน้า {currentPage} จาก {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    ก่อนหน้า
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    ถัดไป
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ===== Cancel Confirmation Dialog (only rendered if canCancel) ===== */}
            {canCancel && (
                <>
                    <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>ยืนยันการยกเลิกเช็คชื่อ</DialogTitle>
                                <DialogDescription>
                                    การยกเลิกจะคืนเครดิตให้นักเรียนอัตโนมัติ
                                </DialogDescription>
                            </DialogHeader>
                            {cancelTarget && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                        <p><strong>นักเรียน:</strong> {cancelTarget.student_full_name}
                                            {cancelTarget.student_nickname && ` (${cancelTarget.student_nickname})`}
                                        </p>
                                        <p><strong>วิชา:</strong> {cancelTarget.subject_name}</p>
                                        <p><strong>เครดิตที่จะคืน:</strong> {cancelTarget.credits_used}</p>
                                        <p><strong>เช็คเมื่อ:</strong> {formatDateTime(cancelTarget.checked_at)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>เหตุผลในการยกเลิก</Label>
                                        <Input
                                            placeholder="เช่น ตัดผิดคน, ตัดผิดวิชา..."
                                            value={cancelReason}
                                            onChange={e => setCancelReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                                    ปิด
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirmCancel}
                                    disabled={cancelling}
                                >
                                    {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>ประวัติ Log</DialogTitle>
                                {logsTarget && (
                                    <DialogDescription>
                                        {logsTarget.student_full_name} - {logsTarget.subject_name} ({formatDateTime(logsTarget.checked_at)})
                                    </DialogDescription>
                                )}
                            </DialogHeader>
                            {loadingLogs ? (
                                <p className="text-center py-4 text-gray-500">กำลังโหลด...</p>
                            ) : logs.length === 0 ? (
                                <p className="text-center py-4 text-gray-500">ไม่พบ Log</p>
                            ) : (
                                <div className="space-y-3">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className={`p-3 rounded-md border ${
                                                log.action === 'cancel'
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-green-50 border-green-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Badge
                                                        variant={log.action === 'cancel' ? 'destructive' : 'default'}
                                                        className={log.action === 'check_in' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                                                    >
                                                        {log.action === 'check_in' ? 'เช็คชื่อ' : 'ยกเลิก'}
                                                    </Badge>
                                                    <p className="text-sm mt-1">
                                                        โดย: {log.profiles?.full_name || '-'}
                                                    </p>
                                                    {log.reason && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            เหตุผล: {log.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {formatDateTime(log.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
                                    ปิด
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}
