
import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  Home, 
  Users, 
  PlusCircle, 
  Settings, 
  Megaphone, 
  School,
  LogOut,
  ChevronRight,
  Filter, 
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  Pencil,
  ClipboardList,
  UserPen,
  Printer,
  X,
  FileText,
  Download,
  LayoutList,
  Eye,
  EyeOff,
  CloudSync,
  RefreshCw,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  FileUp
} from 'lucide-react';

import { 
  Club, 
  Teacher, 
  Student, 
  Announcement, 
  ClubType, 
  LevelCategory 
} from './types.ts';
import { 
  DEPARTMENTS, 
  ROOMS, 
  SCHOOL_LOGO, 
  ADMIN_PASSWORD, 
  INITIAL_ANNOUNCEMENTS 
} from './constants.ts';

// Backend Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbxrlOoiigf2r4uk_bUQaqu2AOun_fgPf5esKzFLf-jQG6O2T4m8jkFL01MDcc8W9Y1q/exec';
const STORAGE_KEY = 'nw_club_reg_v1';

const DEFAULT_RULES = [
  'นักเรียนสามารถสมัครได้เพียงชุมนุมเดียวเท่านั้น',
  'ถ้าต้องการออก หรือย้ายชุมนุมให้นักเรียนแจ้งครูประจำชุมนุมเพื่อย้าย ครูจะคัดชื่อออก',
  'นักเรียนทุกคนจำเป็น ต้องมีชุมนุม และต้องผ่านเท่านั้น เป็นกิจกรรมบังคับ',
  'แต่ละชุมนุมรับนักเรียนได้เพียง 25 คน ยกเว้นมีครู 2 คน สามารถรับนักเรียนได้ 50 คน',
  'นักเรียนที่มีผลการเรียน "ไม่ผ่าน" ให้ติดต่อครูที่ปรึกษาชุมนุมเพื่อทำการแก้ไข'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'reports' | 'teacher' | 'admin'>('home');
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [registrationRules, setRegistrationRules] = useState<string[]>(DEFAULT_RULES);
  const [previewClub, setPreviewClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Admin Filter States
  const [adminFilterDept, setAdminFilterDept] = useState('ทั้งหมด');
  const [adminFilterClub, setAdminFilterClub] = useState('');
  const [adminSortOrder, setAdminSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Auth States
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Fetch from Google Sheets on load
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data && !data.error) {
        setTeachers(data.teachers || []);
        setStudents(data.students || []);
        setClubs(data.clubs || []);
        setAnnouncements(data.announcements && data.announcements.length > 0 ? data.announcements : INITIAL_ANNOUNCEMENTS);
        setIsSystemOpen(data.settings?.isSystemOpen ?? true);
        setRegistrationRules(data.settings?.registrationRules && data.settings.registrationRules.length > 0 ? data.settings.registrationRules : DEFAULT_RULES);
      } else if (data && data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire({
        title: 'กำลังเชื่อมต่อข้อมูล...',
        text: 'ระบบกำลังดึงข้อมูลจาก LocalStorage เนื่องจากไม่สามารถติดต่อ Google Sheets ได้',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      });
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setTeachers(parsed.teachers || []);
        setStudents(parsed.students || []);
        setClubs(parsed.clubs || []);
        setAnnouncements(parsed.announcements || INITIAL_ANNOUNCEMENTS);
        setIsSystemOpen(parsed.isSystemOpen ?? true);
        setRegistrationRules(parsed.registrationRules || DEFAULT_RULES);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncToBackend = async (currentState: any) => {
    setIsSyncing(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action: 'syncAll', data: currentState })
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const timeoutId = setTimeout(() => {
      syncToBackend({
        teachers,
        students,
        clubs,
        announcements,
        isSystemOpen,
        registrationRules
      });
    }, 2000); 
    return () => clearTimeout(timeoutId);
  }, [teachers, students, clubs, announcements, isSystemOpen, registrationRules]);

  const filteredAndSortedTeachers = useMemo(() => {
    let result = teachers.map(t => {
      const tClubs = clubs.filter(c => String(c.advisorId) === String(t.id) || String(c.coAdvisorId) === String(t.id));
      const tRegTotal = students.filter(s => tClubs.map(c => String(c.id)).includes(String(s.clubId))).length;
      return { ...t, tClubs, tRegTotal };
    });
    if (adminFilterDept !== 'ทั้งหมด') result = result.filter(t => t.department === adminFilterDept);
    if (adminFilterClub.trim() !== '') result = result.filter(t => t.tClubs.some(c => String(c.name).toLowerCase().includes(adminFilterClub.toLowerCase())));
    if (adminSortOrder === 'asc') result.sort((a, b) => a.tRegTotal - b.tRegTotal);
    else if (adminSortOrder === 'desc') result.sort((a, b) => b.tRegTotal - a.tRegTotal);
    return result;
  }, [teachers, clubs, students, adminFilterDept, adminFilterClub, adminSortOrder]);

  const top10Clubs = useMemo(() => {
    return [...clubs]
      .map(c => ({
        ...c,
        regCount: students.filter(s => String(s.clubId) === String(c.id)).length
      }))
      .sort((a, b) => b.regCount - a.regCount)
      .slice(0, 10);
  }, [clubs, students]);

  const sortedClubs = useMemo(() => {
    return [...clubs]
      .map(c => ({
        ...c,
        regCount: students.filter(s => String(s.clubId) === String(c.id)).length
      }))
      .sort((a, b) => {
        const aFull = a.regCount >= a.capacity;
        const bFull = b.regCount >= b.capacity;
        if (aFull && !bFull) return 1;
        if (!aFull && bFull) return -1;
        return b.regCount - a.regCount;
      });
  }, [clubs, students]);

  const handleRegisterStudent = (studentData: Omit<Student, 'grade' | 'note'>) => {
    if (!isSystemOpen) { Swal.fire('ข้อผิดพลาด', 'ระบบปิดรับสมัครแล้ว', 'error'); return; }
    const alreadyRegistered = students.find(s => String(s.id) === String(studentData.id));
    if (alreadyRegistered) { Swal.fire('ข้อผิดพลาด', 'รหัสนักเรียนนี้ลงทะเบียนชุมนุมไปแล้ว', 'error'); return; }
    const club = clubs.find(c => String(c.id) === String(studentData.clubId));
    if (club) {
      const currentCount = students.filter(s => String(s.clubId) === String(club.id)).length;
      if (currentCount >= club.capacity) { Swal.fire('ข้อผิดพลาด', 'ชุมนุมนี้เต็มแล้ว', 'error'); return; }
    }
    setStudents(prev => [...prev, { ...studentData, grade: null }]);
    Swal.fire('สำเร็จ', 'ลงทะเบียนชุมนุมเรียบร้อยแล้ว', 'success');
  };

  const handleCreateClub = (clubData: Omit<Club, 'id'>) => {
    const newClub = { ...clubData, id: Date.now().toString() };
    setClubs(prev => [...prev, newClub]);
    Swal.fire('สำเร็จ', 'สร้างชุมนุมเรียบร้อยแล้ว', 'success');
  };

  const handleUpdateClub = (updatedClub: Club) => {
    setClubs(prev => prev.map(c => String(c.id) === String(updatedClub.id) ? updatedClub : c));
    Swal.fire('สำเร็จ', 'แก้ไขข้อมูลชุมนุมเรียบร้อยแล้ว', 'success');
  };

  const handleAddTeacher = (teacher: Teacher) => {
    if (teachers.some(t => String(t.id) === String(teacher.id))) { Swal.fire('ข้อผิดพลาด', 'รหัสครูนี้มีในระบบแล้ว', 'error'); return; }
    setTeachers(prev => [...prev, teacher]);
    Swal.fire('สำเร็จ', 'ลงทะเบียนครูเรียบร้อยแล้ว', 'success');
  };

  const handleBulkAddTeachers = (newTeachers: Teacher[]) => {
    const existingIds = new Set(teachers.map(t => String(t.id)));
    const duplicates: string[] = [];
    const uniqueNewOnes: Teacher[] = [];
    newTeachers.forEach(t => {
      if (existingIds.has(String(t.id))) duplicates.push(String(t.id));
      else { uniqueNewOnes.push(t); existingIds.add(String(t.id)); }
    });
    if (uniqueNewOnes.length > 0) {
      setTeachers(prev => [...prev, ...uniqueNewOnes]);
      Swal.fire('สำเร็จ', `นำเข้าครูสำเร็จ ${uniqueNewOnes.length} คน`, 'success');
    }
  };

  const handleUpdateTeacher = (oldId: string, updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => String(t.id) === String(oldId) ? updatedTeacher : t));
    if (String(oldId) !== String(updatedTeacher.id)) {
      setClubs(prev => prev.map(c => ({
        ...c,
        advisorId: String(c.advisorId) === String(oldId) ? updatedTeacher.id : c.advisorId,
        coAdvisorId: String(c.coAdvisorId) === String(oldId) ? updatedTeacher.id : c.coAdvisorId
      })));
    }
    Swal.fire('สำเร็จ', 'แก้ไขข้อมูลครูเรียบร้อยแล้ว', 'success');
  };

  const handleDeleteTeacher = (id: string) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        setTeachers(prev => prev.filter(t => String(t.id) !== String(id)));
        setClubs(prev => prev.filter(c => String(c.advisorId) !== String(id) && String(c.coAdvisorId) !== String(id)));
        Swal.fire('ลบแล้ว', 'ข้อมูลครูถูกลบออกจากระบบ', 'success');
      }
    });
  };

  const handleAdminLogin = async () => {
    const { value: password } = await Swal.fire({
      title: 'เข้าสู่ระบบ Admin', input: 'password', showCancelButton: true
    });
    if (password === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setActiveTab('admin'); Swal.fire('สำเร็จ', 'ยินดีต้อนรับ Admin', 'success'); }
    else if (password) Swal.fire('ผิดพลาด', 'รหัสผ่านไม่ถูกต้อง', 'error');
  };

  const handleTeacherLogin = async () => {
    const { value: id } = await Swal.fire({
      title: 'เข้าสู่ระบบครู', input: 'text', inputAttributes: { maxlength: '4' }, showCancelButton: true
    });
    const teacher = teachers.find(t => String(t.id) === String(id));
    if (teacher) { setLoggedInTeacher(teacher); setActiveTab('teacher'); Swal.fire('สำเร็จ', `ยินดีต้อนรับ ครู${teacher.name}`, 'success'); }
    else if (id) Swal.fire('ผิดพลาด', 'ไม่พบรหัสครูในระบบ', 'error');
  };

  const updateStudentResult = (studentId: string, grade: 'ผ' | 'มผ') => {
    setStudents(prev => prev.map(s => String(s.id) === String(studentId) ? { ...s, grade } : s));
  };

  const updateStudentInfo = (studentId: string, updatedInfo: Partial<Student>) => {
    setStudents(prev => prev.map(s => String(s.id) === String(studentId) ? { ...s, ...updatedInfo } : s));
    Swal.fire('สำเร็จ', 'แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว', 'success');
  };

  const deleteStudent = (studentId: string) => {
    Swal.fire({
      title: 'ถอนชื่อนักเรียน?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        setStudents(prev => prev.filter(s => String(s.id) !== String(studentId)));
        Swal.fire('เรียบร้อย', 'ลบชื่อนักเรียนสำเร็จ', 'success');
      }
    });
  };

  // --- Print Preview Overlay Component ---
  const PrintPreviewOverlay = ({ club, onClose }: { club: Club, onClose: () => void }) => {
    const clubStudents = students
      .filter(s => String(s.clubId) === String(club.id))
      .sort((a, b) => String(a.level).localeCompare(String(b.level)) || String(a.room).localeCompare(String(b.room)) || parseInt(a.seatNumber) - parseInt(b.seatNumber));

    const advisor = teachers.find(t => String(t.id) === String(club.advisorId));
    const coAdvisor = club.coAdvisorId ? teachers.find(t => String(t.id) === String(club.coAdvisorId)) : null;

    const stats = {
      total: clubStudents.length,
      passed: clubStudents.filter(s => s.grade === 'ผ').length,
      failed: clubStudents.filter(s => s.grade === 'มผ').length,
      pending: clubStudents.filter(s => s.grade === null).length
    };

    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(clubStudents.length / pageSize));
    const pages = Array.from({ length: pageCount }, (_, i) => clubStudents.slice(i * pageSize, (i + 1) * pageSize));

    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-start p-4 md:p-10 overflow-y-auto no-print-backdrop">
        <div className="flex justify-center gap-4 mb-6 w-full max-w-4xl print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
          >
            <Printer size={20} /> พิมพ์รายงาน / บันทึกเป็น PDF
          </button>
          <button 
            onClick={onClose}
            className="bg-white text-gray-700 px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 shadow-lg border active:scale-95 transition-all"
          >
            <XCircle size={20} /> ปิดตัวอย่าง
          </button>
        </div>

        <div id="print-content" className="flex flex-col gap-0 bg-transparent">
          {pages.map((studentChunk, pageIdx) => (
            <div key={pageIdx} className="a4-page bg-white relative shadow-2xl overflow-hidden mb-10 print:mb-0 print:shadow-none">
              <div className="absolute top-10 right-12 text-[10px] text-gray-400 font-bold print:top-6 print:right-10">
                หน้า {pageIdx + 1} / {pageCount}
              </div>

              <div className="p-16 h-full flex flex-col print:p-10">
                {pageIdx === 0 ? (
                  <div className="text-center mb-8">
                    <img src={SCHOOL_LOGO} alt="School Logo" className="h-24 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-black leading-tight">บัญชีรายชื่อนักเรียนและผลการประเมินกิจกรรมชุมนุม</h1>
                    <h2 className="text-lg font-bold text-gray-800">ชื่อชุมนุม: {club.name} ({club.type})</h2>
                    <p className="text-md font-medium text-gray-700">โรงเรียนหนองบัวแดงวิทยา</p>
                    <div className="mt-4 flex justify-center gap-10 text-xs font-bold border-y-2 border-black py-2 mt-4">
                      <p>ครูที่ปรึกษาหลัก: {advisor?.name || club.advisorId}</p>
                      {coAdvisor && <p>ครูที่ปรึกษาร่วม: {coAdvisor.name}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-6 border-b-2 border-black pb-2">
                    <h1 className="text-sm font-bold">บัญชีรายชื่อนักเรียนชุมนุม {club.name} (ต่อ) หน้า {pageIdx + 1}</h1>
                  </div>
                )}

                <table className="w-full border-collapse border-2 border-black text-xs mb-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 w-10 text-center">ลำดับ</th>
                      <th className="border border-black p-2 w-24 text-center">รหัสประจำตัว</th>
                      <th className="border border-black p-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="border border-black p-2 w-20 text-center">ชั้น/ห้อง</th>
                      <th className="border border-black p-2 w-24 text-center">ผลการประเมิน</th>
                      <th className="border border-black p-2 w-32 text-center">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentChunk.map((s, idx) => (
                      <tr key={s.id} className="h-8">
                        <td className="border border-black p-1.5 text-center">{(pageIdx * pageSize) + idx + 1}</td>
                        <td className="border border-black p-1.5 text-center font-mono">{s.id}</td>
                        <td className="border border-black p-1.5 px-3 text-left">{s.name}</td>
                        <td className="border border-black p-1.5 text-center">{s.level}/{s.room}</td>
                        <td className="border border-black p-1.5 text-center font-bold">
                          {s.grade === 'ผ' ? 'ผ่าน' : s.grade === 'มผ' ? 'ไม่ผ่าน' : '-'}
                        </td>
                        <td className="border border-black p-1.5"></td>
                      </tr>
                    ))}
                    {studentChunk.length < pageSize && Array.from({ length: pageSize - studentChunk.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8">
                        <td className="border border-black p-1.5">&nbsp;</td>
                        <td className="border border-black p-1.5">&nbsp;</td>
                        <td className="border border-black p-1.5">&nbsp;</td>
                        <td className="border border-black p-1.5">&nbsp;</td>
                        <td className="border border-black p-1.5">&nbsp;</td>
                        <td className="border border-black p-1.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageIdx === pageCount - 1 && (
                  <div className="mt-8">
                    <div className="p-4 border-2 border-black rounded-xl mb-8 print:rounded-none">
                      <h4 className="font-bold text-sm mb-3 border-b border-black pb-1 flex items-center gap-2">
                        <FileText size={16} /> สรุปผลการดำเนินงาน
                      </h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                        <div className="flex justify-between border-b border-dashed border-gray-300">
                          <span>จำนวนนักเรียนทั้งหมด:</span>
                          <span className="font-bold">{stats.total} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-300">
                          <span>ประเมินผ่าน (ผ):</span>
                          <span className="font-bold text-green-700">{stats.passed} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-300">
                          <span>ประเมินไม่ผ่าน (มผ):</span>
                          <span className="font-bold text-red-600">{stats.failed} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-300">
                          <span>ยังไม่ได้ประเมิน:</span>
                          <span className="font-bold text-gray-400">{stats.pending} คน</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex justify-around items-end">
                      <div className="text-center">
                        <div className="mb-10 border-b border-black w-56 mx-auto"></div>
                        <p className="font-bold text-xs">(ลงชื่อ)......................................................</p>
                        <p className="mt-1 font-medium text-xs">ครูที่ปรึกษาหลัก</p>
                        <p className="text-[10px] text-gray-500">({advisor?.name || '........................................'})</p>
                      </div>
                      {coAdvisor && (
                        <div className="text-center">
                          <div className="mb-10 border-b border-black w-56 mx-auto"></div>
                          <p className="font-bold text-xs">(ลงชื่อ)......................................................</p>
                          <p className="mt-1 font-medium text-xs">ครูที่ปรึกษาร่วม</p>
                          <p className="text-[10px] text-gray-500">({coAdvisor.name})</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-6 text-[8px] text-gray-400 italic text-right">
                  พิมพ์จากระบบโรงเรียนหนองบัวแดงวิทยา เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="bg-white shadow-md mb-6 sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center">
        <img src={SCHOOL_LOGO} alt="School Logo" className="h-20 w-auto mb-2" />
        <h1 className="text-xl md:text-2xl font-bold text-blue-900 text-center">
          ระบบสมัครชุมนุมออนไลน์ โรงเรียนหนองบัวแดงวิทยา
        </h1>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <TabButton icon={<Home size={18}/>} label="หน้าหลัก" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton icon={<Users size={18}/>} label="สมัครชุมนุม" active={activeTab === 'register'} onClick={() => setActiveTab('register')} />
          <TabButton icon={<LayoutList size={18}/>} label="รายงาน" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <TabButton icon={<PlusCircle size={18}/>} label="สำหรับครู" active={activeTab === 'teacher'} onClick={loggedInTeacher ? () => setActiveTab('teacher') : handleTeacherLogin} />
          <TabButton icon={<Settings size={18}/>} label="ตั้งค่า" active={activeTab === 'admin'} onClick={isAdminLoggedIn ? () => setActiveTab('admin') : handleAdminLogin} />
        </div>
      </div>
      <div className={`absolute bottom-0 right-4 transform translate-y-1/2 flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-500 ${isSyncing ? 'bg-blue-500 text-white opacity-100 translate-y-[-10px]' : 'bg-green-500 text-white opacity-40 hover:opacity-100'}`}>
        {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <CloudSync size={12} />}
        {isSyncing ? 'กำลังบันทึกลง Google Sheets...' : 'เชื่อมต่อ Google Sheets สำเร็จ'}
      </div>
    </div>
  );

  const Footer = () => (
    <footer className="bg-slate-800 text-white py-8 mt-12 print:hidden">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm">Copyright 2025 by Kru Watcharin Mitreepan Nongbuadaengwittaya School</p>
      </div>
    </footer>
  );

  const TabButton = ({ icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg scale-105' 
          : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 gap-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <img src={SCHOOL_LOGO} className="absolute inset-0 m-auto h-10 w-10 opacity-50" />
        </div>
        <p className="text-blue-900 font-bold animate-pulse">กำลังตรวจสอบการเชื่อมต่อ Google Sheets...</p>
      </div>
    );
  }

  const HomeTab = () => (
    <div className="space-y-8 animate-fadeIn print:hidden">
      <section className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-yellow-500">
        <div className="flex items-center gap-2 mb-4 text-yellow-700">
          <Megaphone size={24} />
          <h2 className="text-xl font-bold">ประกาศ</h2>
        </div>
        {!isSystemOpen && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 font-bold text-center">ปิดระบบรับสมัครแล้ว</div>}
        <div className="space-y-4">
          <p className="font-medium text-blue-800">ยินดีต้อนรับสู่ระบบสมัครชุมนุมออนไลน์ โรงเรียนหนองบัวแดงวิทยา</p>
          <p className="text-gray-600">เลือกชุมนุมที่นักเรียนสนใจ เลือก "tab สมัครชุมนุม" เพื่อดูรายละเอียดและสมัครได้ทันที</p>
          <ul className="list-decimal list-inside space-y-1 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">
            {registrationRules.map((rule, idx) => <li key={idx}>{rule}</li>)}
          </ul>
          <div className="mt-6 border-t pt-4 space-y-3">
            {announcements.filter(a => !a.isHidden).sort((a,b) => (a.isPinned ? -1 : 1)).map(ann => (
              <div key={ann.id} className={`p-3 rounded-lg border ${ann.isPinned ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold flex items-center gap-2">{ann.isPinned && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">ปักหมุด</span>}{ann.title}</h3>
                  <span className="text-xs text-gray-400">{new Date(ann.date).toLocaleDateString('th-TH')}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={<School className="text-blue-500" />} title="จำนวนชุมนุมทั้งหมด" value={clubs.length} unit="ชุมนุม" />
        <StatCard icon={<Users className="text-green-500" />} title="จำนวนการสมัครทั้งหมด" value={students.length} unit="คน" />
      </div>
    </div>
  );

  const RegisterTab = () => {
    const [selectedType, setSelectedType] = useState<string>('ทั้งหมด');
    const filteredClubs = useMemo(() => selectedType === 'ทั้งหมด' ? sortedClubs : sortedClubs.filter(c => c.type === selectedType), [sortedClubs, selectedType]);
    return (
      <div className="animate-fadeIn print:hidden">
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">สมัครเข้าชุมนุม</h2>
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border w-full md:w-auto">
            <Filter size={18} className="text-gray-400 ml-2" />
            <select className="bg-transparent border-none focus:ring-0 text-sm font-medium pr-8" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="ทั้งหมด">ประเภทชุมนุมทั้งหมด</option>
              {Object.values(ClubType).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        {!isSystemOpen && <div className="bg-red-50 border-2 border-red-200 text-red-700 p-8 rounded-2xl text-center mb-8"><XCircle size={48} className="mx-auto mb-4" /><h3 className="text-xl font-bold">ระบบปิดรับสมัครชั่วคราว</h3><p>โปรดติดตามประกาศหน้าแรกเพื่อดูวันเวลาเปิดรับสมัครอีกครั้ง</p></div>}
        <div className="grid grid-cols-1 md:flex-wrap lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => <ClubCard key={club.id} club={club} students={students} teachers={teachers} onRegister={() => openRegistrationModal(club)} disabled={!isSystemOpen} />)}
        </div>
      </div>
    );
  };

  const ReportsTab = () => {
    const [selectedCategory, setSelectedCategory] = useState<LevelCategory>(LevelCategory.JUNIOR);
    const [selectedGrade, setSelectedGrade] = useState<string>('ม.1');
    const [selectedRoom, setSelectedRoom] = useState<string>('1');
    const gradeOptions = selectedCategory === LevelCategory.JUNIOR ? ['ม.1', 'ม.2', 'ม.3'] : ['ม.4', 'ม.5', 'ม.6'];
    useEffect(() => {
      if (selectedCategory === LevelCategory.JUNIOR && !['ม.1', 'ม.2', 'ม.3'].includes(selectedGrade)) setSelectedGrade('ม.1');
      else if (selectedCategory === LevelCategory.SENIOR && !['ม.4', 'ม.5', 'ม.6'].includes(selectedGrade)) setSelectedGrade('ม.4');
    }, [selectedCategory]);
    const reportData = useMemo(() => students.filter(s => String(s.level) === String(selectedGrade) && String(s.room) === String(selectedRoom)).sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber)), [students, selectedGrade, selectedRoom]);
    return (
      <div className="animate-fadeIn print:hidden space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900"><LayoutList size={24} /> รายงานข้อมูลการลงทะเบียนชุมนุมรายห้อง</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-gray-600">ระดับชั้น</label><select className="p-3 border rounded-xl bg-gray-50 font-bold" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as LevelCategory)}><option value={LevelCategory.JUNIOR}>ม.ต้น</option><option value={LevelCategory.SENIOR}>ม.ปลาย</option></select></div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-gray-600">ชั้นปี</label><select className="p-3 border rounded-xl bg-gray-50 font-bold" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>{gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-gray-600">ห้อง</label><select className="p-3 border rounded-xl bg-gray-50 font-bold" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>{ROOMS.map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select></div>
          </div>
        </div>
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"><h3 className="text-lg font-bold text-gray-700">รายงานรายชื่อนักเรียน ชั้น {selectedGrade}/{selectedRoom}</h3><div className="bg-blue-50 px-6 py-2 rounded-xl border border-blue-100 text-blue-700 font-bold shadow-sm">สมัครแล้ว {reportData.length} คน</div></div>
          <div className="overflow-x-auto rounded-xl border border-gray-100"><table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]"><tr><th className="p-4 border-b w-16 text-center">เลขที่</th><th className="p-4 border-b w-32 text-center">รหัสประจำตัว</th><th className="p-4 border-b">ชื่อ-สกุล</th><th className="p-4 border-b">ชื่อชุมนุม</th><th className="p-4 border-b text-center">ประเมิน</th></tr></thead><tbody className="divide-y divide-gray-50">{reportData.length === 0 ? <tr><td colSpan={5} className="p-16 text-center text-gray-400 italic">ไม่พบข้อมูล</td></tr> : reportData.map((s) => { const club = clubs.find(c => String(c.id) === String(s.clubId)); return (<tr key={s.id} className="hover:bg-blue-50/40 transition-colors"><td className="p-4 text-center font-black text-gray-400">{s.seatNumber}</td><td className="p-4 font-mono font-bold text-blue-600 text-center">{s.id}</td><td className="p-4 font-bold text-gray-800">{s.name}</td><td className="p-4"><span className="font-bold text-indigo-700">{club?.name || '-'}</span></td><td className="p-4 text-center">{s.grade ? <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.grade === 'ผ' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{s.grade === 'ผ' ? 'ผ่าน' : 'ไม่ผ่าน'}</span> : <span className="text-gray-300 font-bold">ยังไม่ประเมิน</span>}</td></tr>); })}</tbody></table></div>
        </section>
      </div>
    );
  };

  const openRegistrationModal = async (club: Club) => {
    const { value: formValues } = await Swal.fire({
      title: `สมัครชุมนุม: ${club.name}`, html: `
        <div class="space-y-4 text-left p-1">
          <div class="grid grid-cols-2 gap-4"><div class="flex flex-col gap-1"><label class="text-xs font-bold">รหัสนักเรียน 5 หลัก</label><input id="swal-id" class="border p-2 rounded" maxlength="5"></div><div class="flex flex-col gap-1"><label class="text-xs font-bold">เลขที่</label><input id="swal-seat" type="number" class="border p-2 rounded"></div></div>
          <div class="flex flex-col gap-1"><label class="text-xs font-bold">ชื่อ-สกุล</label><input id="swal-name" class="border p-2 rounded w-full"></div>
          <div class="grid grid-cols-2 gap-4"><div class="flex flex-col gap-1"><label class="text-xs font-bold">ระดับชั้น</label><select id="swal-level" class="border p-2 rounded">${(club.levelTarget === LevelCategory.JUNIOR || club.levelTarget === LevelCategory.BOTH) ? '<option value="ม.1">ม.1</option><option value="ม.2">ม.2</option><option value="ม.3">ม.3</option>' : ''}${(club.levelTarget === LevelCategory.SENIOR || club.levelTarget === LevelCategory.BOTH) ? '<option value="ม.4">ม.4</option><option value="ม.5">ม.5</option><option value="ม.6">ม.6</option>' : ''}</select></div><div class="flex flex-col gap-1"><label class="text-xs font-bold">ห้อง</label><select id="swal-room" class="border p-2 rounded">${ROOMS.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div></div>
        </div>`, showCancelButton: true, preConfirm: () => {
        const id = (document.getElementById('swal-id') as HTMLInputElement).value;
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const seat = (document.getElementById('swal-seat') as HTMLInputElement).value;
        if (!id || id.length !== 5 || !name || !seat) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
        return { id, name, seatNumber: seat, level: (document.getElementById('swal-level') as HTMLSelectElement).value, room: (document.getElementById('swal-room') as HTMLSelectElement).value, clubId: String(club.id) };
      }
    });
    if (formValues) handleRegisterStudent(formValues);
  };

  const TeacherTab = () => {
    const [searchId, setSearchId] = useState('');
    const [foundTeacher, setFoundTeacher] = useState<Teacher | null>(loggedInTeacher);
    if (!foundTeacher) return <div className="flex justify-center p-12 print:hidden"><button onClick={handleTeacherLogin} className="bg-blue-600 text-white px-8 py-3 rounded-xl shadow-lg">เข้าสู่ระบบครู</button></div>;
    const teacherClubs = clubs.filter(c => String(c.advisorId) === String(foundTeacher.id) || String(c.coAdvisorId) === String(foundTeacher.id));
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4 print:hidden"><div className="flex items-center gap-3"><div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={28} /></div><div><h2 className="font-bold text-xl">ครู{foundTeacher.name}</h2><p className="text-sm text-gray-500">{foundTeacher.department}</p></div></div><button onClick={() => { setLoggedInTeacher(null); setFoundTeacher(null); }} className="text-red-500 font-bold flex items-center gap-1"><LogOut size={18} /> ออกจากระบบ</button></div>
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden"><div className="flex flex-col md:flex-row gap-3"><input type="text" placeholder="ค้นหาครูด้วยรหัส 4 หลัก" className="flex-1 border p-3 rounded-xl" value={searchId} onChange={(e) => setSearchId(e.target.value)}/><button onClick={() => { const t = teachers.find(t => String(t.id) === String(searchId)); if (t) setFoundTeacher(t); else Swal.fire('ไม่พบข้อมูล', 'ไม่พบรหัสครูในระบบ', 'info'); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">ค้นหา</button></div></section>
        <section className="space-y-6">
          <div className="flex justify-between items-center print:hidden"><h3 className="text-2xl font-bold text-gray-800">ชุมนุมที่ดูแล</h3>{teacherClubs.length === 0 && <button onClick={() => openCreateClubModal(foundTeacher)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold">สร้างชุมนุมใหม่</button>}</div>
          {teacherClubs.length === 0 ? <div className="bg-white p-20 text-center rounded-2xl text-gray-400 border-2 border-dashed print:hidden">ยังไม่มีชุมนุมที่ดูแล</div> : teacherClubs.map(club => <ClubManagementCard key={club.id} club={club} students={students} teachers={teachers} isLeadAdvisor={String(club.advisorId) === String(foundTeacher.id)} onUpdate={(c: Club) => openUpdateClubModal(c, foundTeacher)} onDelete={() => { Swal.fire({ title: 'ลบชุมนุม?', text: "รายชื่อนักเรียนจะถูกลบทั้งหมด", icon: 'warning', showCancelButton: true }).then(res => { if (res.isConfirmed) { setClubs(prev => prev.filter(c => String(c.id) !== String(club.id))); setStudents(prev => prev.filter(s => String(s.clubId) !== String(club.id))); } }); }} onGradeUpdate={updateStudentResult} onStudentDelete={deleteStudent} onStudentUpdate={updateStudentInfo} onPrint={() => setPreviewClub(club)} />)}
        </section>
      </div>
    );
  };

  const AdminTab = () => {
    if (!isAdminLoggedIn) return null;
    return (
      <div className="space-y-8 animate-fadeIn print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm gap-4"><h2 className="text-xl font-bold flex items-center gap-2"><Settings /> จัดการระบบผู้ดูแล</h2><div className="flex gap-2"><button onClick={() => setIsSystemOpen(!isSystemOpen)} className={`px-6 py-2 rounded-xl font-bold text-white ${isSystemOpen ? 'bg-red-500' : 'bg-green-500'}`}>{isSystemOpen ? 'ปิดรับสมัคร' : 'เปิดรับสมัคร'}</button><button onClick={() => setIsAdminLoggedIn(false)} className="bg-gray-100 p-2 rounded-xl"><LogOut size={20}/></button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard icon={<Users className="text-blue-500"/>} title="ครูทั้งหมด" value={teachers.length} unit="คน" /><StatCard icon={<Users className="text-green-500"/>} title="สมัครแล้ว" value={students.length} unit="คน" /><StatCard icon={<School className="text-purple-500"/>} title="ชุมนุมทั้งหมด" value={clubs.length} unit="ชุมนุม" /></div>
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold">จัดการครูและชุมนุม</h3><div className="flex gap-2"><button onClick={handleRegisterTeacherModal} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">เพิ่มครู</button><button onClick={handleBulkRegisterTeacherModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">นำเข้าครูเยอะๆ</button></div></div>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-4 border-b">รหัสครู</th><th className="p-4 border-b">ชื่อ-สกุล</th><th className="p-4 border-b">ชุมนุม</th><th className="p-4 border-b text-right">จัดการ</th></tr></thead><tbody className="divide-y">{teachers.map(t => { const tClubs = clubs.filter(c => String(c.advisorId) === String(t.id) || String(c.coAdvisorId) === String(t.id)); return (<tr key={t.id}><td className="p-4 font-mono">{t.id}</td><td className="p-4"><b>{t.name}</b><br/><small>{t.department}</small></td><td className="p-4">{tClubs.map(c => <div key={c.id} className="text-xs text-blue-600">{c.name}</div>)}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => handleEditTeacherModal(t)} className="p-2 bg-blue-50 rounded"><Pencil size={16}/></button><button onClick={() => handleDeleteTeacher(t.id)} className="p-2 bg-red-50 rounded"><XCircle size={16}/></button></div></td></tr>); })}</tbody></table></div>
        </section>
      </div>
    );
  };

  const handleEditRulesModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขระเบียบการ', html: `<textarea id="rules-input" class="w-full h-40 border p-2 rounded">${registrationRules.join('\n')}</textarea>`, showCancelButton: true, preConfirm: () => (document.getElementById('rules-input') as HTMLTextAreaElement).value.split('\n').filter(r => r.trim() !== "")
    });
    if (formValues) setRegistrationRules(formValues);
  };

  const handleRegisterTeacherModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'ลงทะเบียนครูใหม่', html: `<div class="text-left"><label class="text-xs">รหัสครู 4 หลัก</label><input id="t-id" class="w-full border p-2 mb-2 rounded"><label class="text-xs">ชื่อ-นามสกุล</label><input id="t-name" class="w-full border p-2 mb-2 rounded"><label class="text-xs">กลุ่มสาระ</label><select id="t-dept" class="w-full border p-2 rounded">${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}</select></div>`, showCancelButton: true, preConfirm: () => ({ id: (document.getElementById('t-id') as HTMLInputElement).value.trim(), name: (document.getElementById('t-name') as HTMLInputElement).value.trim(), department: (document.getElementById('t-dept') as HTMLSelectElement).value })
    });
    if (formValues) handleAddTeacher(formValues);
  };

  const handleBulkRegisterTeacherModal = async () => {
    const { value: bulkText } = await Swal.fire({
      title: 'นำเข้าครูเยอะๆ (รหัส,ชื่อ,กลุ่มสาระ)', html: `<textarea id="bulk-t" class="w-full h-40 border p-2 rounded" placeholder="t001,นาย ก,ศิลปะ"></textarea>`, showCancelButton: true, preConfirm: () => (document.getElementById('bulk-t') as HTMLTextAreaElement).value.split('\n').map(line => { const [id, name, dept] = line.split(',').map(s => s.trim()); return { id, name, department: dept }; }).filter(t => t.id && t.name && DEPARTMENTS.includes(t.department))
    });
    if (bulkText) handleBulkAddTeachers(bulkText);
  };

  const handleEditTeacherModal = async (teacher: Teacher) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขข้อมูลครู', html: `<div class="text-left"><label class="text-xs">รหัสครู</label><input id="t-id" class="w-full border p-2 mb-2 rounded" value="${teacher.id}"><label class="text-xs">ชื่อ-นามสกุล</label><input id="t-name" class="w-full border p-2 mb-2 rounded" value="${teacher.name}"><label class="text-xs">กลุ่มสาระ</label><select id="t-dept" class="w-full border p-2 rounded">${DEPARTMENTS.map(d => `<option value="${d}" ${teacher.department === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`, showCancelButton: true, preConfirm: () => ({ id: (document.getElementById('t-id') as HTMLInputElement).value.trim(), name: (document.getElementById('t-name') as HTMLInputElement).value.trim(), department: (document.getElementById('t-dept') as HTMLSelectElement).value })
    });
    if (formValues) handleUpdateTeacher(teacher.id, formValues);
  };

  const openCreateClubModal = (teacher: Teacher) => {
    Swal.fire({
      title: 'สร้างชุมนุมใหม่', html: `<div class="text-left space-y-2"><label class="text-xs">ชื่อชุมนุม</label><input id="c-name" class="w-full border p-2 rounded"><label class="text-xs">ประเภท</label><select id="c-type" class="w-full border p-2 rounded">${Object.values(ClubType).map(t => `<option value="${t}">${t}</option>`).join('')}</select><label class="text-xs">ระดับ</label><select id="c-target" class="w-full border p-2 rounded">${Object.values(LevelCategory).map(t => `<option value="${t}">${t}</option>`).join('')}</select><label class="text-xs">สถานที่</label><input id="c-loc" class="w-full border p-2 rounded"></div>`, showCancelButton: true, preConfirm: () => ({ name: (document.getElementById('c-name') as HTMLInputElement).value.trim(), type: (document.getElementById('c-type') as HTMLSelectElement).value, levelTarget: (document.getElementById('c-target') as HTMLSelectElement).value, location: (document.getElementById('c-loc') as HTMLInputElement).value, advisorId: teacher.id, capacity: 25, description: '', phone: '' })
    }).then(res => { if (res.isConfirmed) handleCreateClub(res.value); });
  };

  const openUpdateClubModal = (club: Club, teacher: Teacher) => {
    Swal.fire({
      title: 'แก้ไขชุมนุม', html: `<div class="text-left space-y-2"><label class="text-xs">ชื่อชุมนุม</label><input id="c-name" class="w-full border p-2 rounded" value="${club.name}"><label class="text-xs">สถานที่</label><input id="c-loc" class="w-full border p-2 rounded" value="${club.location}"></div>`, showCancelButton: true, preConfirm: () => ({ ...club, name: (document.getElementById('c-name') as HTMLInputElement).value.trim(), location: (document.getElementById('c-loc') as HTMLInputElement).value.trim() })
    }).then(res => { if (res.isConfirmed) handleUpdateClub(res.value); });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; background: white !important; }
          #print-content, #print-content * { visibility: visible !important; }
          #print-content { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            z-index: 9999 !important;
            display: block !important;
            background: white !important;
          }
          .a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 15mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            display: flex !important;
            flex-direction: column !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          table, th, td { border-color: black !important; }
          .print-hidden, .print\:hidden { display: none !important; }
          /* Ensure text is black for printing */
          * { color: black !important; }
          .text-green-700 { color: #15803d !important; }
          .text-red-600 { color: #dc2626 !important; }
          .text-gray-400 { color: #9ca3af !important; }
        }
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          margin: 0 auto;
          box-sizing: border-box;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
      `}</style>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 w-full pb-20">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'register' && <RegisterTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'teacher' && <TeacherTab />}
        {activeTab === 'admin' && <AdminTab />}
      </main>
      {previewClub && <PrintPreviewOverlay club={previewClub} onClose={() => setPreviewClub(null)} />}
      <Footer />
    </div>
  );
};

const StatCard = ({ icon, title, value, unit }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className="bg-gray-50 p-4 rounded-xl">{icon}</div>
    <div><p className="text-gray-500 text-sm font-medium">{title}</p><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-gray-800">{value}</span><span className="text-gray-400 text-sm font-medium">{unit}</span></div></div>
  </div>
);

const ClubCard = ({ club, students, teachers, onRegister, disabled }: any) => {
  const count = students.filter((s: Student) => String(s.clubId) === String(club.id)).length;
  const isFull = count >= club.capacity;
  const percent = (count / club.capacity) * 100;
  const advisor = teachers.find((t: Teacher) => String(t.id) === String(club.advisorId));
  const badgeColor = isFull ? 'bg-red-100 text-red-700' : percent >= 80 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
  return (
    <div className="group rounded-2xl border-2 transition-all overflow-hidden flex flex-col h-full hover:shadow-xl bg-white border-gray-100">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4"><span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${badgeColor}`}>{club.type}</span>{isFull && <span className="text-red-600 font-bold text-sm">เต็ม</span>}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{club.name}</h3>
        <p className="text-xs text-gray-500 mb-6">{advisor ? `ครู: ${advisor.name}` : ''}</p>
        <div className="mt-auto"><div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase text-gray-400"><span>ความจุ</span><span>{count} / {club.capacity}</span></div><div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-full transition-all ${isFull ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, percent)}%` }} /></div></div>
      </div>
      <button disabled={disabled || isFull} onClick={onRegister} className={`w-full py-4 text-center font-bold text-sm ${isFull || disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isFull ? 'เต็มแล้ว' : 'สมัครชุมนุม'}</button>
    </div>
  );
};

const ClubManagementCard = ({ club, students, teachers, isLeadAdvisor, onUpdate, onDelete, onGradeUpdate, onStudentDelete, onStudentUpdate, onPrint }: any) => {
  const clubStudents = students.filter((s: Student) => String(s.clubId) === String(club.id)).sort((a: Student, b: Student) => parseInt(a.seatNumber) - parseInt(b.seatNumber));
  const handleEditStudent = async (student: Student) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขนักเรียน', html: `<div class="text-left"><label class="text-xs">ชื่อ-สกุล</label><input id="s-name" class="w-full border p-2 mb-2 rounded" value="${student.name}"><label class="text-xs">เลขที่</label><input id="s-seat" type="number" class="w-full border p-2 rounded" value="${student.seatNumber}"></div>`, showCancelButton: true, preConfirm: () => ({ name: (document.getElementById('s-name') as HTMLInputElement).value.trim(), seatNumber: (document.getElementById('s-seat') as HTMLInputElement).value })
    });
    if (formValues) onStudentUpdate(student.id, formValues);
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-slate-50 p-6 flex justify-between items-center border-b gap-4">
        <div><h4 className="text-2xl font-bold text-blue-900">{club.name}</h4><div className="text-xs font-bold text-gray-500">สถานที่: {club.location} | จำนวน {clubStudents.length} / {club.capacity}</div></div>
        <div className="flex gap-2">{isLeadAdvisor && (<><button onClick={() => onUpdate(club)} className="bg-white border text-gray-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">แก้ไข</button><button onClick={onDelete} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">ลบ</button></>)}</div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6"><h5 className="font-bold flex items-center gap-2"><Users size={18} /> รายชื่อนักเรียน</h5><button onClick={onPrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Printer size={16} /> พิมพ์รายงาน</button></div>
        <div className="overflow-x-auto rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-4">รหัส</th><th className="p-4">ชื่อ-สกุล</th><th className="p-4 text-center">ประเมิน</th><th className="p-4 text-center">จัดการ</th></tr></thead><tbody className="divide-y">{clubStudents.map((s: Student) => (<tr key={s.id}><td className="p-4 font-mono">{s.id}</td><td className="p-4"><b>{s.name}</b><br/><small>{s.level}/{s.room} (เลขที่ {s.seatNumber})</small></td><td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => onGradeUpdate(s.id, 'ผ')} className={`px-2 py-1 rounded text-xs ${s.grade === 'ผ' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>ผ</button><button onClick={() => onGradeUpdate(s.id, 'มผ')} className={`px-2 py-1 rounded text-xs ${s.grade === 'มผ' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>มผ</button></div></td><td className="p-4 text-center"><div className="flex justify-center gap-1"><button onClick={() => handleEditStudent(s)} className="p-2 text-blue-400"><Pencil size={18}/></button><button onClick={() => onStudentDelete(s.id)} className="p-2 text-red-400"><XCircle size={18}/></button></div></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
};

export default App;
