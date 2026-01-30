
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
} from './types';
import { 
  DEPARTMENTS, 
  ROOMS, 
  SCHOOL_LOGO, 
  ADMIN_PASSWORD, 
  INITIAL_ANNOUNCEMENTS 
} from './constants';

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
      // Fallback to localStorage
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

  // Sync to Backend
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

  // Debounce Sync
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

  // Derived Stats for Admin Teacher List
  const filteredAndSortedTeachers = useMemo(() => {
    let result = teachers.map(t => {
      const tClubs = clubs.filter(c => String(c.advisorId) === String(t.id) || String(c.coAdvisorId) === String(t.id));
      const tRegTotal = students.filter(s => tClubs.map(c => String(c.id)).includes(String(s.clubId))).length;
      return { ...t, tClubs, tRegTotal };
    });

    if (adminFilterDept !== 'ทั้งหมด') {
      result = result.filter(t => t.department === adminFilterDept);
    }

    if (adminFilterClub.trim() !== '') {
      result = result.filter(t => 
        t.tClubs.some(c => String(c.name).toLowerCase().includes(adminFilterClub.toLowerCase()))
      );
    }

    if (adminSortOrder === 'asc') {
      result.sort((a, b) => a.tRegTotal - b.tRegTotal);
    } else if (adminSortOrder === 'desc') {
      result.sort((a, b) => b.tRegTotal - a.tRegTotal);
    }

    return result;
  }, [teachers, clubs, students, adminFilterDept, adminFilterClub, adminSortOrder]);

  // Derived Stats
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

  // Handlers
  const handleRegisterStudent = (studentData: Omit<Student, 'grade' | 'note'>) => {
    if (!isSystemOpen) {
      Swal.fire('ข้อผิดพลาด', 'ระบบปิดรับสมัครแล้ว', 'error');
      return;
    }

    const alreadyRegistered = students.find(s => String(s.id) === String(studentData.id));
    if (alreadyRegistered) {
      Swal.fire('ข้อผิดพลาด', 'รหัสนักเรียนนี้ลงทะเบียนชุมนุมไปแล้ว', 'error');
      return;
    }

    const club = clubs.find(c => String(c.id) === String(studentData.clubId));
    if (club) {
      const currentCount = students.filter(s => String(s.clubId) === String(club.id)).length;
      if (currentCount >= club.capacity) {
        Swal.fire('ข้อผิดพลาด', 'ชุมนุมนี้เต็มแล้ว', 'error');
        return;
      }
    }

    setStudents(prev => [...prev, { ...studentData, grade: null }]);
    Swal.fire('สำเร็จ', 'ลงทะเบียนชุมนุมเรียบร้อยแล้ว ระบบกำลังบันทึกลง Google Sheets', 'success');
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
    if (teachers.some(t => String(t.id) === String(teacher.id))) {
      Swal.fire('ข้อผิดพลาด', 'รหัสครูนี้มีในระบบแล้ว', 'error');
      return;
    }
    setTeachers(prev => [...prev, teacher]);
    Swal.fire('สำเร็จ', 'ลงทะเบียนครูเรียบร้อยแล้ว', 'success');
  };

  const handleBulkAddTeachers = (newTeachers: Teacher[]) => {
    const existingIds = new Set(teachers.map(t => String(t.id)));
    const duplicates: string[] = [];
    const uniqueNewOnes: Teacher[] = [];

    newTeachers.forEach(t => {
      if (existingIds.has(String(t.id))) {
        duplicates.push(String(t.id));
      } else {
        uniqueNewOnes.push(t);
        existingIds.add(String(t.id));
      }
    });

    if (uniqueNewOnes.length > 0) {
      setTeachers(prev => [...prev, ...uniqueNewOnes]);
      Swal.fire('สำเร็จ', `นำเข้าครูสำเร็จ ${uniqueNewOnes.length} คน${duplicates.length > 0 ? ` (ข้ามรหัสซ้ำ: ${duplicates.join(', ')})` : ''}`, 'success');
    } else {
      Swal.fire('คำเตือน', 'ไม่มีข้อมูลใหม่ให้นำเข้า (รหัสซ้ำทั้งหมดหรือรูปแบบไม่ถูกต้อง)', 'warning');
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
      title: 'คุณแน่ใจหรือไม่?',
      text: "ข้อมูลครูและชุมนุมที่เกี่ยวข้องจะหายไป",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
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
      title: 'เข้าสู่ระบบ Admin',
      input: 'password',
      inputPlaceholder: 'กรอกรหัสผ่าน',
      showCancelButton: true
    });

    if (password === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setActiveTab('admin');
      Swal.fire('สำเร็จ', 'ยินดีต้อนรับ Admin', 'success');
    } else if (password) {
      Swal.fire('ผิดพลาด', 'รหัสผ่านไม่ถูกต้อง', 'error');
    }
  };

  const handleTeacherLogin = async () => {
    const { value: id } = await Swal.fire({
      title: 'เข้าสู่ระบบครู',
      input: 'text',
      inputPlaceholder: 'กรอกรหัสครู 4 หลัก',
      inputAttributes: {
        maxlength: '4',
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true
    });

    const teacher = teachers.find(t => String(t.id) === String(id));
    if (teacher) {
      setLoggedInTeacher(teacher);
      setActiveTab('teacher');
      Swal.fire('สำเร็จ', `ยินดีต้อนรับ ครู${teacher.name}`, 'success');
    } else if (id) {
      Swal.fire('ผิดพลาด', 'ไม่พบรหัสครูในระบบ หรือรหัสไม่ถูกต้อง', 'error');
    }
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
      title: 'ถอนชื่อนักเรียน?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
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

    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto no-print-backdrop">
        <div className="bg-white w-full max-w-4xl min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl flex flex-col print:shadow-none print:rounded-none">
          <div className="flex-1 p-12 bg-white print:p-0 print:m-0" id="print-content">
            <div className="text-center mb-10 print:mt-4">
              <img src={SCHOOL_LOGO} alt="School Logo" className="h-28 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-black mb-2 leading-tight text-center">บัญชีรายชื่อนักเรียนและผลการประเมินกิจกรรมชุมนุม</h1>
              <h2 className="text-xl font-bold text-gray-800 text-center">ชื่อชุมนุม: {club.name} ({club.type})</h2>
              <div className="mt-4 flex flex-col items-center gap-1.5 text-gray-700 font-medium">
                <p className="text-lg">โรงเรียนหนองบัวแดงวิทยา</p>
                <p>ครูที่ปรึกษาหลัก: <strong>{advisor?.name || club.advisorId}</strong></p>
                {coAdvisor && <p>ครูที่ปรึกษาร่วม: <strong>{coAdvisor.name}</strong></p>}
                <div className="mt-4 flex gap-8 text-sm bg-gray-50 px-8 py-3 rounded-2xl border border-gray-200 print:bg-white print:border-black print:rounded-none">
                   <p>จำนวนที่รับตามแผน: <strong>{club.capacity}</strong> คน</p>
                   <p>จำนวนที่สมัครจริง: <strong>{stats.total}</strong> คน</p>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border-2 border-black text-sm mb-10">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100">
                  <th className="border border-black p-2.5 w-12 text-center font-bold">ลำดับ</th>
                  <th className="border border-black p-2.5 w-28 text-center font-bold">รหัสนักเรียน</th>
                  <th className="border border-black p-2.5 font-bold text-left">ชื่อ-นามสกุล</th>
                  <th className="border border-black p-2.5 w-24 text-center font-bold">ชั้น/ห้อง</th>
                  <th className="border border-black p-2.5 w-32 text-center font-bold">ผลการประเมิน</th>
                  <th className="border border-black p-2.5 w-40 text-center font-bold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {clubStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-black p-12 text-center text-gray-400 italic">ไม่พบข้อมูลนักเรียนในชุมนุมนี้</td>
                  </tr>
                ) : (
                  clubStudents.map((s, idx) => (
                    <tr key={s.id} className="print:break-inside-avoid">
                      <td className="border border-black p-2.5 text-center">{idx + 1}</td>
                      <td className="border border-black p-2.5 text-center font-mono">{s.id}</td>
                      <td className="border border-black p-2.5 px-4 text-left">{s.name}</td>
                      <td className="border border-black p-2.5 text-center">{s.level}/{s.room}</td>
                      <td className="border border-black p-2.5 text-center font-bold">
                        {s.grade === 'ผ' ? 'ผ่าน' : s.grade === 'มผ' ? 'ไม่ผ่าน' : '-'}
                      </td>
                      <td className="border border-black p-2.5"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="p-6 border-2 border-black rounded-2xl mb-12 print:rounded-none print:break-inside-avoid">
               <h4 className="font-bold text-lg mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                 <FileText size={20} /> สรุปผลการดำเนินงาน
               </h4>
               <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                  <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-1">
                    <span>จำนวนนักเรียนทั้งหมด:</span>
                    <span className="font-bold text-xl">{stats.total} คน</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-1">
                    <span>ประเมินผ่าน (ผ):</span>
                    <span className="font-bold text-xl text-green-700">{stats.passed} คน</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-1">
                    <span>ประเมินไม่ผ่าน (มผ):</span>
                    <span className="font-bold text-xl text-red-600">{stats.failed} คน</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-1">
                    <span>ยังไม่ได้ประเมิน:</span>
                    <span className="font-bold text-xl text-gray-400">{stats.pending} คน</span>
                  </div>
               </div>
            </div>

            <div className="mt-24 flex justify-between px-16 print:break-inside-avoid">
              <div className="text-center">
                <div className="mb-14 border-b border-black w-60 mx-auto"></div>
                <p className="font-bold">(ลงชื่อ)......................................................</p>
                <p className="mt-2 font-medium">ครูที่ปรึกษาหลัก</p>
                <p className="text-sm text-gray-500 mt-1">({advisor?.name || '........................................'})</p>
              </div>
              {coAdvisor && (
                <div className="text-center">
                  <div className="mb-14 border-b border-black w-60 mx-auto"></div>
                  <p className="font-bold">(ลงชื่อ)......................................................</p>
                  <p className="mt-2 font-medium">ครูที่ปรึกษาร่วม</p>
                  <p className="text-sm text-gray-500 mt-1">({coAdvisor.name})</p>
                </div>
              )}
            </div>

            <div className="mt-20 text-right text-[10px] text-gray-400 italic print:block">
               พิมพ์จากระบบออนไลน์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
            </div>

            <div className="mt-12 flex flex-col md:flex-row justify-center gap-4 print:hidden">
              <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
              >
                <Download size={24} /> ดาวน์โหลดรายงาน (PDF)
              </button>
              <button 
                onClick={onClose}
                className="bg-gray-100 text-gray-600 px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95"
              >
                <XCircle size={24} /> ปิดหน้าต่าง
              </button>
            </div>
          </div>
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
        {!isSystemOpen && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 font-bold text-center">
            ปิดระบบรับสมัครแล้ว
          </div>
        )}
        <div className="space-y-4">
          <p className="font-medium text-blue-800">ยินดีต้อนรับสู่ระบบสมัครชุมนุมออนไลน์ โรงเรียนหนองบัวแดงวิทยา</p>
          <p className="text-gray-600">เลือกชุมนุมที่นักเรียนสนใจ เลือก "tab สมัครชุมนุม" เพื่อดูรายละเอียดและสมัครได้ทันที</p>
          <ul className="list-decimal list-inside space-y-1 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">
            {registrationRules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
          
          <div className="mt-6 border-t pt-4 space-y-3">
            {announcements
              .filter(a => !a.isHidden)
              .sort((a,b) => (a.isPinned ? -1 : 1))
              .map(ann => (
              <div key={ann.id} className={`p-3 rounded-lg border ${ann.isPinned ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold flex items-center gap-2">
                    {ann.isPinned && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">ปักหมุด</span>}
                    {ann.title}
                  </h3>
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

      <section className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="text-purple-500" />
          10 อันดับชุมนุมยอดนิยม
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                <th className="p-3 font-semibold rounded-l-lg">อันดับ</th>
                <th className="p-3 font-semibold">ชื่อชุมนุม</th>
                <th className="p-3 font-semibold text-center">นักเรียน / จำนวนเต็ม</th>
                <th className="p-3 font-semibold rounded-r-lg">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {top10Clubs.map((club, idx) => (
                <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-gray-400">#{idx + 1}</td>
                  <td className="p-3 font-medium text-gray-800">{club.name}</td>
                  <td className="p-3 text-center">
                    <span className="font-mono">{club.regCount}</span> / <span className="text-gray-400">{club.capacity}</span>
                  </td>
                  <td className="p-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${club.regCount >= club.capacity ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (club.regCount / club.capacity) * 100)}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
      if (selectedCategory === LevelCategory.JUNIOR && !['ม.1', 'ม.2', 'ม.3'].includes(selectedGrade)) {
        setSelectedGrade('ม.1');
      } else if (selectedCategory === LevelCategory.SENIOR && !['ม.4', 'ม.5', 'ม.6'].includes(selectedGrade)) {
        setSelectedGrade('ม.4');
      }
    }, [selectedCategory]);

    const reportData = useMemo(() => {
      // ใช้ String() เพื่อป้องกันปัญหา Data type (Number vs String) จาก Google Sheets
      return students
        .filter(s => String(s.level) === String(selectedGrade) && String(s.room) === String(selectedRoom))
        .sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber));
    }, [students, selectedGrade, selectedRoom]);

    return (
      <div className="animate-fadeIn print:hidden space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900">
            <LayoutList size={24} /> รายงานข้อมูลการลงทะเบียนชุมนุมรายห้อง
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-600">ระดับชั้น</label>
              <select 
                className="p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as LevelCategory)}
              >
                <option value={LevelCategory.JUNIOR}>ม.ต้น</option>
                <option value={LevelCategory.SENIOR}>ม.ปลาย</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-600">ชั้นปี</label>
              <select 
                className="p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-600">ห้อง</label>
              <select 
                className="p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                {ROOMS.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-700">รายงานรายชื่อนักเรียน ชั้น {selectedGrade}/{selectedRoom}</h3>
            <div className="bg-blue-50 px-6 py-2 rounded-xl border border-blue-100 text-blue-700 font-bold shadow-sm">
              นักเรียนในห้องที่สมัครแล้ว {reportData.length} คน
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4 border-b w-16 text-center">เลขที่</th>
                  <th className="p-4 border-b w-32 text-center">รหัสประจำตัว</th>
                  <th className="p-4 border-b">ชื่อ-สกุล</th>
                  <th className="p-4 border-b">ชื่อชุมนุม</th>
                  <th className="p-4 border-b">ครูที่ปรึกษา</th>
                  <th className="p-4 border-b text-center">ผลการประเมิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-gray-400 italic">ไม่พบข้อมูลนักเรียนที่ลงทะเบียนในชั้นและห้องนี้</td>
                  </tr>
                ) : (
                  reportData.map((s) => {
                    const club = clubs.find(c => String(c.id) === String(s.clubId));
                    const advisor = teachers.find(t => String(t.id) === String(club?.advisorId));
                    const coAdvisor = club?.coAdvisorId ? teachers.find(t => String(t.id) === String(club.coAdvisorId)) : null;
                    
                    return (
                      <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-4 text-center font-black text-gray-400">{s.seatNumber}</td>
                        <td className="p-4 font-mono font-bold text-blue-600 text-center">{s.id}</td>
                        <td className="p-4 font-bold text-gray-800">{s.name}</td>
                        <td className="p-4">
                          <span className="font-bold text-indigo-700">{club?.name || '-'}</span>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{club?.type}</div>
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-bold text-gray-700">{advisor?.name || '-'}</div>
                          {coAdvisor && <div className="text-gray-400 font-medium italic mt-0.5">ร่วม: {coAdvisor.name}</div>}
                        </td>
                        <td className="p-4 text-center">
                          {s.grade ? (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.grade === 'ผ' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                              {s.grade === 'ผ' ? 'ผ่าน' : 'ไม่ผ่าน'}
                            </span>
                          ) : (
                            <span className="text-gray-300 font-bold">ยังไม่ประเมิน</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const openRegistrationModal = async (club: Club) => {
    const currentRegCount = students.filter(s => String(s.clubId) === String(club.id)).length;
    if (currentRegCount >= club.capacity) { Swal.fire('ขออภัย', 'ชุมนุมนี้มีผู้สมัครเต็มแล้ว', 'warning'); return; }
    const { value: formValues } = await Swal.fire({
      title: `สมัครชุมนุม: ${club.name}`,
      width: '500px',
      html: `
        <div class="space-y-4 text-left p-1">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">รหัสนักเรียน 5 หลัก</label>
              <input id="swal-id" class="w-full px-4 py-2 border rounded-lg" maxlength="5">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">เลขที่</label>
              <input id="swal-seat" type="number" class="w-full px-4 py-2 border rounded-lg" min="1" max="60">
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">ชื่อ-สกุล</label>
            <input id="swal-name" class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ระดับชั้น</label>
              <select id="swal-level" class="w-full px-4 py-2 border rounded-lg">
                ${(club.levelTarget === LevelCategory.JUNIOR || club.levelTarget === LevelCategory.BOTH) ? '<option value="ม.1">ม.1</option><option value="ม.2">ม.2</option><option value="ม.3">ม.3</option>' : ''}
                ${(club.levelTarget === LevelCategory.SENIOR || club.levelTarget === LevelCategory.BOTH) ? '<option value="ม.4">ม.4</option><option value="ม.5">ม.5</option><option value="ม.6">ม.6</option>' : ''}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ห้อง</label>
              <select id="swal-room" class="w-full px-4 py-2 border rounded-lg">
                ${ROOMS.map(r => `<option value="${r}">${r}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>`,
      showCancelButton: true,
      preConfirm: () => {
        const id = (document.getElementById('swal-id') as HTMLInputElement).value.trim();
        const name = (document.getElementById('swal-name') as HTMLInputElement).value.trim();
        const seatNumber = (document.getElementById('swal-seat') as HTMLInputElement).value.trim();
        if (!id || id.length !== 5 || isNaN(Number(id))) { Swal.showValidationMessage('กรุณากรอกรหัสนักเรียน 5 หลักให้ถูกต้อง'); return false; }
        if (!seatNumber || isNaN(Number(seatNumber))) { Swal.showValidationMessage('กรุณากรอกเลขที่'); return false; }
        if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อ-สกุล'); return false; }
        return { 
          id, 
          name, 
          seatNumber,
          level: (document.getElementById('swal-level') as HTMLSelectElement).value, 
          room: (document.getElementById('swal-room') as HTMLSelectElement).value, 
          clubId: String(club.id) 
        };
      }
    });
    if (formValues) handleRegisterStudent(formValues);
  };

  const TeacherTab = () => {
    const [searchId, setSearchId] = useState('');
    const [foundTeacher, setFoundTeacher] = useState<Teacher | null>(loggedInTeacher);
    if (!foundTeacher) return <div className="flex justify-center p-12 print:hidden"><button onClick={handleTeacherLogin} className="bg-blue-600 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-blue-700">เข้าสู่ระบบครู</button></div>;
    
    const teacherClubs = clubs.filter(c => String(c.advisorId) === String(foundTeacher.id) || String(c.coAdvisorId) === String(foundTeacher.id));
    const hasClub = teacherClubs.length > 0;

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4 print:hidden">
          <div className="flex items-center gap-3"><div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={28} /></div><div><h2 className="font-bold text-xl">ครู{foundTeacher.name}</h2><p className="text-sm text-gray-500">{foundTeacher.department}</p></div></div>
          <button onClick={() => { setLoggedInTeacher(null); setFoundTeacher(null); }} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-1 font-bold"><LogOut size={18} /> ออกจากระบบ</button>
        </div>
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Search size={20} className="text-blue-500" /> ค้นหา/จัดการข้อมูลครู</h3><div className="flex flex-col md:flex-row gap-3"><input type="text" placeholder="กรอกรหัสครู 4 หลัก" className="flex-1 border-2 border-gray-100 p-3 rounded-xl" value={searchId} onChange={(e) => setSearchId(e.target.value)}/><button onClick={() => { const t = teachers.find(t => String(t.id) === String(searchId)); if (t) setFoundTeacher(t); else Swal.fire('ไม่พบข้อมูล', 'ไม่พบรหัสครูในระบบ', 'info'); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700">ค้นหา</button></div></section>
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <h3 className="text-2xl font-bold text-gray-800">ชุมนุมที่ดูแล</h3>
            {!hasClub && (
              <button onClick={() => openCreateClubModal(foundTeacher)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 shadow-lg shadow-green-100">
                <PlusCircle size={20} /> สร้างชุมนุมใหม่
              </button>
            )}
            {hasClub && <span className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold">ครูมีชุมนุมที่รับผิดชอบแล้ว (จำกัด 1 ชุมนุมต่อคน)</span>}
          </div>
          {teacherClubs.length === 0 ? (
            <div className="bg-white p-20 text-center rounded-2xl text-gray-400 border-2 border-dashed print:hidden">
              ยังไม่มีชุมนุมภายใต้การดูแล
            </div>
          ) : (
            teacherClubs.map(club => (
              <ClubManagementCard 
                key={club.id} 
                club={club} 
                students={students} 
                teachers={teachers} 
                isLeadAdvisor={String(club.advisorId) === String(foundTeacher.id)} 
                onUpdate={(c: Club) => openUpdateClubModal(c, foundTeacher)} 
                onDelete={() => { 
                  Swal.fire({ 
                    title: 'ลบชุมนุม?', 
                    text: "รายชื่อนักเรียนจะถูกลบทั้งหมด", 
                    icon: 'warning', 
                    showCancelButton: true, 
                    confirmButtonColor: '#ef4444' 
                  }).then(res => { 
                    if (res.isConfirmed) { 
                      setClubs(prev => prev.filter(c => String(c.id) !== String(club.id))); 
                      setStudents(prev => prev.filter(s => String(s.clubId) !== String(club.id))); 
                      Swal.fire('สำเร็จ', 'ลบชุมนุมแล้ว', 'success'); 
                    } 
                  }); 
                }} 
                onGradeUpdate={updateStudentResult} 
                onStudentDelete={deleteStudent} 
                onStudentUpdate={updateStudentInfo} 
                onPrint={() => setPreviewClub(club)} 
              />
            ))
          )}
        </section>
      </div>
    );
  };

  const AdminTab = () => {
    if (!isAdminLoggedIn) return null;
    return (
      <div className="space-y-8 animate-fadeIn print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4"><h2 className="text-xl font-bold flex items-center gap-2 text-gray-800"><Settings /> จัดการระบบผู้ดูแล</h2><div className="flex gap-2"><button onClick={() => setIsSystemOpen(!isSystemOpen)} className={`px-6 py-2 rounded-xl font-bold text-white shadow-md transition-all ${isSystemOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>{isSystemOpen ? 'ปิดระบบรับสมัครนักเรียน' : 'เปิดระบบรับสมัครนักเรียน'}</button><button onClick={() => setIsAdminLoggedIn(false)} className="bg-gray-100 text-gray-500 p-2.5 rounded-xl hover:bg-gray-200"><LogOut size={20}/></button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard icon={<Users className="text-blue-500"/>} title="ครูทั้งหมด" value={teachers.length} unit="คน" /><StatCard icon={<Users className="text-green-500"/>} title="นักเรียนสมัครแล้ว" value={students.length} unit="คน" /><StatCard icon={<School className="text-purple-500"/>} title="ชุมนุมทั้งหมด" value={clubs.length} unit="ชุมนุม" /></div>
        
        {/* Rules Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="text-indigo-500" /> จัดการระเบียบการสมัคร</h3><button onClick={handleEditRulesModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold">แก้ไขระเบียบการ</button></div><ul className="space-y-2">{registrationRules.map((rule, idx) => <li key={idx} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">{idx + 1}. {rule}</li>)}</ul></section>
        
        {/* Announcements Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">จัดการประกาศหน้าแรก</h3>
            <button onClick={handleAddAnnouncement} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
              <PlusCircle size={16}/> เพิ่มประกาศใหม่
            </button>
          </div>
          <div className="space-y-2">
            {announcements.map(ann => (
              <div key={ann.id} className={`flex justify-between items-center p-4 bg-gray-50 rounded-xl border transition-colors ${ann.isHidden ? 'opacity-50 border-dashed' : 'hover:border-blue-200'}`}>
                <div>
                  <span className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    {ann.isPinned && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">PINNED</span>}
                    {ann.isHidden && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">HIDDEN</span>}
                    {ann.title}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{ann.content.substring(0, 100)}...</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditAnnouncement(ann)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Pencil size={18}/></button>
                  <button onClick={() => setAnnouncements(prev => prev.map(a => String(a.id) === String(ann.id) ? {...a, isHidden: !a.isHidden} : a))} className={`p-2 rounded-lg ${ann.isHidden ? 'bg-slate-200 text-slate-500' : 'bg-green-50 text-green-600'}`}>{ann.isHidden ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                  <button onClick={() => setAnnouncements(prev => prev.map(a => String(a.id) === String(ann.id) ? {...a, isPinned: !a.isPinned} : a))} className={`p-2 rounded-lg ${ann.isPinned ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>📌</button>
                  <button onClick={() => setAnnouncements(prev => prev.filter(a => String(a.id) !== String(ann.id)))} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><XCircle size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Teacher and Club List Section with Filter/Sort */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold">รายชื่อครูและข้อมูลชุมนุม</h3>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleRegisterTeacherModal} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md shadow-green-50">
                <PlusCircle size={18}/> ลงทะเบียนครู
              </button>
              <button onClick={handleBulkRegisterTeacherModal} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-50">
                <FileUp size={18}/> นำเข้าครูหลายคน
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">กรองตามกลุ่มสาระ</label>
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none"
                  value={adminFilterDept}
                  onChange={(e) => setAdminFilterDept(e.target.value)}
                >
                  <option value="ทั้งหมด">แสดงทุกกลุ่มสาระ</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">กรองตามชื่อชุมนุม</label>
              <div className="relative">
                <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none"
                  value={adminFilterClub}
                  onChange={(e) => setAdminFilterClub(e.target.value)}
                >
                  <option value="">ทุกชุมนุม</option>
                  {Array.from(new Set(clubs.map(c => String(c.name)))).sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">จัดเรียงจำนวนนักเรียน</label>
              <button 
                onClick={() => setAdminSortOrder(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${adminSortOrder !== 'none' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {adminSortOrder === 'none' && <ArrowUpDown size={16} />}
                {adminSortOrder === 'asc' && <ArrowUpNarrowWide size={16} />}
                {adminSortOrder === 'desc' && <ArrowDownWideNarrow size={16} />}
                {adminSortOrder === 'none' ? 'ปกติ' : adminSortOrder === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-bold">
                <tr>
                  <th className="p-4 border-b">รหัสครู</th>
                  <th className="p-4 border-b">ชื่อ-สกุล</th>
                  <th className="p-4 border-b">ชุมนุมที่ดูแล</th>
                  <th className="p-4 border-b text-center">นักเรียนรวม</th>
                  <th className="p-4 border-b text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 italic">ไม่พบข้อมูลที่ตรงตามเงื่อนไขการค้นหา</td>
                  </tr>
                ) : (
                  filteredAndSortedTeachers.map(teacher => (
                    <tr key={teacher.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-600">{teacher.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{teacher.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{teacher.department}</div>
                      </td>
                      <td className="p-4 text-gray-600 max-w-[200px] truncate">
                        {teacher.tClubs.length > 0 ? (
                          teacher.tClubs.map(c => (
                            <div key={c.id} className="flex flex-col">
                              <span className="font-bold text-indigo-600">{c.name}</span>
                              <span className="text-[10px] text-gray-400">({c.type})</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-300 italic">ไม่มีชุมนุม</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {teacher.tClubs.length > 0 ? (
                          <span className={`font-bold px-3 py-1 rounded-full text-xs ${teacher.tRegTotal >= 20 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {teacher.tRegTotal} คน
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditTeacherModal(teacher)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Pencil size={18}/></button>
                          <button onClick={() => handleDeleteTeacher(teacher.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><XCircle size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-[10px] font-bold text-gray-400 text-right">
            แสดงทั้งหมด {filteredAndSortedTeachers.length} รายการ
          </div>
        </section>
      </div>
    );
  };

  const handleEditRulesModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขระเบียบการสมัคร',
      width: '600px',
      html: `
        <div class="space-y-3 text-left p-1">
          ${registrationRules.map((rule, idx) => `<div class="flex flex-col gap-1"><label class="text-xs font-bold text-gray-400 uppercase">ระเบียบที่ ${idx + 1}</label><input id="rule-${idx}" class="w-full px-4 py-2 border rounded-xl" value="${rule}"></div>`).join('')}
        </div>`,
      showCancelButton: true,
      preConfirm: () => registrationRules.map((_, idx) => (document.getElementById(`rule-${idx}`) as HTMLInputElement).value.trim())
    });
    if (formValues) { setRegistrationRules(formValues); Swal.fire('สำเร็จ', 'อัปเดตระเบียบการเรียบร้อยแล้ว', 'success'); }
  };

  const handleRegisterTeacherModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'ลงทะเบียนครูใหม่',
      width: '450px',
      html: `
        <div class="space-y-5 text-left p-1">
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">รหัสครู 4 หลัก</label><input id="t-id" class="w-full px-4 py-2.5 border rounded-xl" maxlength="4" placeholder="เช่น t202"></div>
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">ชื่อ-นามสกุล</label><input id="t-name" class="w-full px-4 py-2.5 border rounded-xl" placeholder="ชื่อ-นามสกุล"></div>
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">กลุ่มสาระการเรียนรู้</label><select id="t-dept" class="w-full px-4 py-2.5 border rounded-xl">${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}</select></div>
        </div>`,
      showCancelButton: true,
      preConfirm: () => {
        const id = (document.getElementById('t-id') as HTMLInputElement).value.trim();
        const name = (document.getElementById('t-name') as HTMLInputElement).value.trim();
        if (id.length !== 4) { Swal.showValidationMessage('รหัสต้องมี 4 หลัก'); return false; }
        if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อ'); return false; }
        return { id, name, department: (document.getElementById('t-dept') as HTMLSelectElement).value };
      }
    });
    if (formValues) handleAddTeacher(formValues);
  };

  const handleBulkRegisterTeacherModal = async () => {
    const { value: bulkText } = await Swal.fire({
      title: 'นำเข้าครูหลายคน',
      width: '600px',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h5 class="text-sm font-bold text-blue-800 mb-2">รูปแบบข้อมูล:</h5>
            <p class="text-xs text-blue-700 font-mono">รหัสครู,ชื่อ-นามสกุล,กลุ่มสาระ</p>
            <p class="text-xs text-blue-600 mt-1 italic">ตัวอย่าง: t202,นายพรชัย ใจกล้า,ศิลปะ</p>
            <p class="text-xs text-red-600 mt-2 font-bold">* หนึ่งบรรทัดต่อหนึ่งคน และต้องระบุกลุ่มสาระให้ถูกต้องตามระบบ</p>
          </div>
          <textarea id="bulk-teacher-input" class="w-full h-64 p-4 border-2 border-gray-100 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="วางข้อมูลที่นี่..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ประมวลผลข้อมูล',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        const input = (document.getElementById('bulk-teacher-input') as HTMLTextAreaElement).value.trim();
        if (!input) { Swal.showValidationMessage('กรุณากรอกข้อมูล'); return false; }
        
        const lines = input.split('\n');
        const newTeachers: Teacher[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length === 3) {
            const [id, name, department] = parts;
            if (id.length !== 4) {
              errors.push(`บรรทัดที่ ${index + 1}: รหัสครูต้องมี 4 หลัก (${id})`);
            } else if (!DEPARTMENTS.includes(department)) {
              errors.push(`บรรทัดที่ ${index + 1}: กลุ่มสาระไม่ถูกต้อง (${department})`);
            } else {
              newTeachers.push({ id, name, department });
            }
          } else if (line.trim() !== '') {
            errors.push(`บรรทัดที่ ${index + 1}: รูปแบบไม่ถูกต้อง (ต้องมี 3 ส่วนแยกด้วยคอมม่า)`);
          }
        });

        if (errors.length > 0) {
          Swal.showValidationMessage(errors.slice(0, 3).join('<br>') + (errors.length > 3 ? `<br>...และอีก ${errors.length - 3} ข้อผิดพลาด` : ''));
          return false;
        }
        return newTeachers;
      }
    });

    if (bulkText) {
      handleBulkAddTeachers(bulkText);
    }
  };

  const handleEditTeacherModal = async (teacher: Teacher) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขข้อมูลครู',
      width: '450px',
      html: `
        <div class="space-y-5 text-left p-1">
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">รหัสครู 4 หลัก</label><input id="t-id" class="w-full px-4 py-2.5 border rounded-xl" value="${teacher.id}" maxlength="4"></div>
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">ชื่อ-นามสกุล</label><input id="t-name" class="w-full px-4 py-2.5 border rounded-xl" value="${teacher.name}"></div>
          <div class="flex flex-col gap-1.5"><label class="text-sm font-bold text-gray-700">กลุ่มสาระ</label><select id="t-dept" class="w-full px-4 py-2.5 border rounded-xl">${DEPARTMENTS.map(d => `<option value="${d}" ${teacher.department === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        </div>`,
      showCancelButton: true,
      preConfirm: () => ({ id: (document.getElementById('t-id') as HTMLInputElement).value.trim(), name: (document.getElementById('t-name') as HTMLInputElement).value.trim(), department: (document.getElementById('t-dept') as HTMLSelectElement).value })
    });
    if (formValues) handleUpdateTeacher(teacher.id, formValues);
  };

  const handleAddAnnouncement = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'เพิ่มประกาศใหม่',
      html: `<div class="space-y-4 text-left p-1"><input id="a-title" class="w-full border p-2" placeholder="หัวข้อ"><textarea id="a-content" class="w-full border p-2 h-32" placeholder="เนื้อหา"></textarea></div>`,
      showCancelButton: true,
      preConfirm: () => ({ title: (document.getElementById('a-title') as HTMLInputElement).value.trim(), content: (document.getElementById('a-content') as HTMLTextAreaElement).value.trim() })
    });
    if (formValues) { setAnnouncements(prev => [{...formValues, id: Date.now().toString(), date: new Date().toISOString(), isPinned: false, isHidden: false}, ...prev]); Swal.fire('สำเร็จ', 'เพิ่มประกาศแล้ว', 'success'); }
  };

  const handleEditAnnouncement = async (ann: Announcement) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขประกาศ',
      html: `
        <div class="space-y-4 text-left p-1">
          <input id="a-title-edit" class="w-full border p-2 rounded-lg" placeholder="หัวข้อ" value="${ann.title}">
          <textarea id="a-content-edit" class="w-full border p-2 h-32 rounded-lg" placeholder="เนื้อหา">${ann.content}</textarea>
        </div>`,
      showCancelButton: true,
      preConfirm: () => ({ 
        title: (document.getElementById('a-title-edit') as HTMLInputElement).value.trim(), 
        content: (document.getElementById('a-content-edit') as HTMLTextAreaElement).value.trim() 
      })
    });
    if (formValues) { 
      setAnnouncements(prev => prev.map(a => String(a.id) === String(ann.id) ? {...a, ...formValues} : a)); 
      Swal.fire('สำเร็จ', 'แก้ไขประกาศเรียบร้อยแล้ว', 'success'); 
    }
  };

  const openCreateClubModal = (teacher: Teacher) => {
    const teachersWithClubIds = clubs.flatMap(c => [String(c.advisorId), String(c.coAdvisorId)]).filter(id => id !== "undefined" && !!id);
    const availableTeachers = teachers.filter(t => 
      String(t.id) !== String(teacher.id) && !teachersWithClubIds.includes(String(t.id))
    );

    Swal.fire({
      title: 'สร้างชุมนุมใหม่',
      width: '650px',
      padding: '2rem',
      html: `
        <div class="space-y-4 text-left p-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ชื่อชุมนุม</label>
              <input id="c-name" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ชื่อชุมนุม">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ประเภทชุมนุม</label>
              <select id="c-type" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                ${Object.values(ClubType).map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ระดับชั้นที่รับสมัคร</label>
              <select id="c-target" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                ${Object.values(LevelCategory).map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">จำนวนที่รับสมัคร (คน)</label>
              <input id="c-cap" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="25" readonly>
              <span class="text-[10px] text-gray-400 font-bold">* ปรับอัตโนมัติตามครูที่ปรึกษา</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">ครูที่ปรึกษาร่วม (ถ้ามี)</label>
            <select id="c-co" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">-- ไม่มีครูที่ปรึกษาร่วม --</option>
              ${availableTeachers
                .map(t => `<option value="${t.id}">ครู${t.name} (${t.department})</option>`)
                .join('')}
            </select>
            <p class="text-[10px] text-orange-600 font-bold">* กรองเฉพาะครูที่ยังไม่มีชุมนุม (1 คนต่อ 1 ชุมนุม)</p>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">รายละเอียดชุมนุม</label>
            <textarea id="c-desc" class="w-full px-4 py-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="รายละเอียด..."></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">สถานที่นัดพบ/เรียน</label>
              <input id="c-loc" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="สถานที่">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">เบอร์โทรศัพท์ติดต่อ</label>
              <input id="c-phone" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เบอร์โทร">
            </div>
          </div>
        </div>`,
      showCancelButton: true,
      didOpen: () => {
        const coAdvisorSelect = Swal.getPopup()?.querySelector('#c-co') as HTMLSelectElement;
        const capacityInput = Swal.getPopup()?.querySelector('#c-cap') as HTMLInputElement;
        if (coAdvisorSelect && capacityInput) {
          coAdvisorSelect.addEventListener('change', () => {
            capacityInput.value = coAdvisorSelect.value ? '50' : '25';
          });
        }
      },
      preConfirm: () => {
        const name = (document.getElementById('c-name') as HTMLInputElement).value.trim();
        const capacity = parseInt((document.getElementById('c-cap') as HTMLInputElement).value);
        if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อชุมนุม'); return false; }
        return {
          name,
          type: (document.getElementById('c-type') as HTMLSelectElement).value,
          levelTarget: (document.getElementById('c-target') as HTMLSelectElement).value,
          description: (document.getElementById('c-desc') as HTMLTextAreaElement).value,
          location: (document.getElementById('c-loc') as HTMLInputElement).value,
          phone: (document.getElementById('c-phone') as HTMLInputElement).value,
          advisorId: String(teacher.id),
          coAdvisorId: (document.getElementById('c-co') as HTMLSelectElement).value || undefined,
          capacity: capacity
        };
      }
    }).then(res => { if (res.isConfirmed) handleCreateClub(res.value); });
  };

  const openUpdateClubModal = (club: Club, teacher: Teacher) => {
    const otherClubsTeachers = clubs
      .filter(c => String(c.id) !== String(club.id))
      .flatMap(c => [String(c.advisorId), String(c.coAdvisorId)])
      .filter(id => id !== "undefined" && !!id);
    
    const availableTeachers = teachers.filter(t => 
      String(t.id) !== String(club.advisorId) && (!otherClubsTeachers.includes(String(t.id)) || String(club.coAdvisorId) === String(t.id))
    );

    Swal.fire({
      title: 'แก้ไขข้อมูลชุมนุม',
      width: '650px',
      padding: '2rem',
      html: `
        <div class="space-y-4 text-left">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ชื่อชุมนุม</label>
              <input id="edit-c-name" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="${club.name}">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ประเภทชุมนุม</label>
              <select id="edit-c-type" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                ${Object.values(ClubType).map(t => `<option value="${t}" ${club.type === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ระดับชั้นที่รับสมัคร</label>
              <select id="edit-c-target" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                ${Object.values(LevelCategory).map(t => `<option value="${t}" ${club.levelTarget === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">จำนวนที่รับสมัคร (คน)</label>
              <input id="edit-c-cap" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="${club.capacity}" readonly>
              <span class="text-[10px] text-gray-400 font-bold">* ปรับอัตโนมัติตามครูที่ปรึกษา</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">ครูที่ปรึกษาร่วม (Co-Advisor)</label>
            <select id="edit-c-co" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">-- ไม่มีครูที่ปรึกษาร่วม --</option>
              ${availableTeachers
                .map(t => `<option value="${t.id}" ${String(club.coAdvisorId) === String(t.id) ? 'selected' : ''}>ครู${t.name} (${t.department})</option>`)
                .join('')}
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">รายละเอียดชุมนุม</label>
            <textarea id="edit-c-desc" class="w-full px-4 py-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none">${club.description}</textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">สถานที่นัดพบ/เรียน</label>
              <input id="edit-c-loc" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="${club.location}">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">เบอร์โทรศัพท์ติดต่อ</label>
              <input id="edit-c-phone" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="${club.phone}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      didOpen: () => {
        const coAdvisorSelect = Swal.getPopup()?.querySelector('#edit-c-co') as HTMLSelectElement;
        const capacityInput = Swal.getPopup()?.querySelector('#edit-c-cap') as HTMLInputElement;
        if (coAdvisorSelect && capacityInput) {
          coAdvisorSelect.addEventListener('change', () => {
            capacityInput.value = coAdvisorSelect.value ? '50' : '25';
          });
        }
      },
      preConfirm: () => {
        const name = (document.getElementById('edit-c-name') as HTMLInputElement).value.trim();
        const capacity = parseInt((document.getElementById('edit-c-cap') as HTMLInputElement).value);
        const coAdvisorId = (document.getElementById('edit-c-co') as HTMLSelectElement).value;

        if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อชุมนุม'); return false; }
        return {
          ...club,
          name,
          type: (document.getElementById('edit-c-type') as HTMLSelectElement).value as ClubType,
          levelTarget: (document.getElementById('edit-c-target') as HTMLSelectElement).value as LevelCategory,
          capacity,
          description: (document.getElementById('edit-c-desc') as HTMLTextAreaElement).value.trim(),
          location: (document.getElementById('edit-c-loc') as HTMLInputElement).value.trim(),
          phone: (document.getElementById('edit-c-phone') as HTMLInputElement).value.trim(),
          coAdvisorId: coAdvisorId || undefined
        };
      }
    }).then(res => {
      if (res.isConfirmed) handleUpdateClub(res.value);
    });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { background-color: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; visibility: hidden !important; }
          #print-content, #print-content * { visibility: visible !important; }
          #root > *:not(.no-print-backdrop) { display: none !important; }
          header, footer, nav, button, .no-print, .print-hidden { display: none !important; }
          .no-print-backdrop { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; display: block !important; background: white !important; backdrop-filter: none !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; z-index: 9999 !important; }
          .no-print-backdrop > div { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; position: static !important; background: white !important; }
          #print-content { display: block !important; padding: 0 !important; margin: 0 !important; background: white !important; width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; border: 2px solid black !important; }
          th, td { border: 1px solid black !important; padding: 8px !important; color: black !important; }
          .print-break-inside-avoid { break-inside: avoid !important; }
          img { max-width: 150px !important; }
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

// --- Helper Components ---

const StatCard = ({ icon, title, value, unit }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className="bg-gray-50 p-4 rounded-xl">{icon}</div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        <span className="text-gray-400 text-sm font-medium">{unit}</span>
      </div>
    </div>
  </div>
);

const ClubCard = ({ club, students, teachers, onRegister, disabled }: any) => {
  const count = students.filter((s: Student) => String(s.clubId) === String(club.id)).length;
  const isFull = count >= club.capacity;
  const percent = (count / club.capacity) * 100;
  const advisor = teachers.find((t: Teacher) => String(t.id) === String(club.advisorId));
  const coAdvisor = club.coAdvisorId ? teachers.find((t: Teacher) => String(t.id) === String(club.coAdvisorId)) : null;
  const advisorDisplay = advisor ? `ครู${advisor.name}` : club.advisorId;
  const coAdvisorDisplay = coAdvisor ? `ครู${coAdvisor.name}` : club.coAdvisorId;
  let borderColor = isFull ? 'border-red-200 bg-red-50/50' : percent >= 80 ? 'border-orange-200 bg-orange-50/50' : 'border-green-200 bg-green-50/50';
  let badgeColor = isFull ? 'bg-red-100 text-red-700' : percent >= 80 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';

  return (
    <div className={`group rounded-2xl border-2 transition-all overflow-hidden flex flex-col h-full hover:shadow-xl ${borderColor}`}>
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4"><span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${badgeColor}`}>{club.type}</span>{isFull && <span className="text-red-600 font-bold text-sm bg-white px-2 py-0.5 rounded shadow-sm border border-red-100 animate-pulse">เต็มแล้ว</span>}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{club.name}</h3>
        <p className="text-xs text-gray-500 mb-6 line-clamp-3 leading-relaxed">{club.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
        <div className="space-y-2.5 text-xs text-gray-600 mb-6 font-medium">
          <div className="flex items-center gap-2"><div className="p-1.5 bg-white rounded shadow-sm"><Users size={12} className="text-gray-400"/></div><span>สำหรับ {club.levelTarget}</span></div>
          <div className="flex items-center gap-2"><div className="p-1.5 bg-white rounded shadow-sm"><Users size={12} className="text-gray-400"/></div><span className="truncate">ครู: {advisorDisplay} {coAdvisorDisplay ? `และ ${coAdvisorDisplay}` : ''}</span></div>
        </div>
        <div className="mt-auto"><div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-wider text-gray-400"><span>สถานะการสมัคร</span><span className={isFull ? 'text-red-600' : 'text-gray-600'}>{count} / {club.capacity}</span></div><div className="w-full bg-white rounded-full h-2 overflow-hidden shadow-inner border border-gray-100"><div className={`h-full transition-all duration-700 ${isFull ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, percent)}%` }} /></div></div>
      </div>
      <button disabled={disabled || isFull} onClick={onRegister} className={`w-full py-4 text-center font-bold text-sm transition-all ${isFull || disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-t' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isFull ? 'ปิดรับสมัคร' : 'ลงชื่อสมัครชุมนุม'}</button>
    </div>
  );
};

const ClubManagementCard = ({ club, students, teachers, isLeadAdvisor, onUpdate, onDelete, onGradeUpdate, onStudentDelete, onStudentUpdate, onPrint }: any) => {
  const clubStudents = students.filter((s: Student) => String(s.clubId) === String(club.id)).sort((a: Student, b: Student) => String(a.level).localeCompare(String(b.level)) || String(a.room).localeCompare(String(b.room)) || parseInt(a.seatNumber) - parseInt(b.seatNumber));
  
  const handleEditStudent = async (student: Student) => {
    const { value: formValues } = await Swal.fire({
      title: `แก้ไขข้อมูล: ${student.name}`,
      width: '450px',
      padding: '1.5rem',
      html: `
        <div class="space-y-4 text-left p-1">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">รหัสนักเรียน (5 หลัก)</label>
              <input id="edit-s-id" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value="${student.id}" placeholder="ระบุรหัส 5 หลัก" maxlength="5">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">เลขที่</label>
              <input id="edit-s-seat" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value="${student.seatNumber}">
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-bold text-gray-700">ชื่อ-สกุล</label>
            <input id="edit-s-name" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value="${student.name}" placeholder="นาย/น.ส. สมชาย ใจดี">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ระดับชั้น</label>
              <select id="edit-s-level" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                ${['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(l => `<option value="${l}" ${student.level === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-bold text-gray-700">ห้อง</label>
              <select id="edit-s-room" class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                ${ROOMS.map(r => `<option value="${r}" ${student.room === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const newId = (document.getElementById('edit-s-id') as HTMLInputElement).value.trim();
        const name = (document.getElementById('edit-s-name') as HTMLInputElement).value.trim();
        const seatNumber = (document.getElementById('edit-s-seat') as HTMLInputElement).value.trim();
        const level = (document.getElementById('edit-s-level') as HTMLSelectElement).value;
        const room = (document.getElementById('edit-s-room') as HTMLSelectElement).value;

        if (!newId || newId.length !== 5 || isNaN(Number(newId))) {
          Swal.showValidationMessage('กรุณากรอกรหัสนักเรียน 5 หลักให้ถูกต้อง');
          return false;
        }

        if (String(newId) !== String(student.id) && students.some((s: Student) => String(s.id) === String(newId))) {
          Swal.showValidationMessage('รหัสนักเรียนใหม่นี้มีอยู่ในระบบแล้ว');
          return false;
        }

        if (!seatNumber || isNaN(Number(seatNumber))) {
          Swal.showValidationMessage('กรุณากรอกเลขที่');
          return false;
        }

        if (!name) {
          Swal.showValidationMessage('กรุณากรอกชื่อ-สกุล');
          return false;
        }
        return { id: newId, name, seatNumber, level, room };
      }
    });

    if (formValues) {
      onStudentUpdate(student.id, formValues);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-slate-50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 gap-4">
        <div>
          <h4 className="text-2xl font-bold text-blue-900 leading-tight">{club.name}</h4>
          <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-gray-500 font-bold"><span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm"><MapPin size={14} className="text-blue-500"/> {club.location}</span><span className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-md shadow-md"><Users size={14}/> {clubStudents.length} / {club.capacity} คน</span></div>
        </div>
        <div className="flex gap-2">{isLeadAdvisor && (<><button onClick={() => onUpdate(club)} className="bg-white border-2 border-gray-100 text-gray-600 px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95">แก้ไขข้อมูล</button><button onClick={onDelete} className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-sm font-bold border-2 border-red-100 transition-all active:scale-95">ลบชุมนุม</button></>)}</div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6"><h5 className="font-bold text-gray-700 flex items-center gap-2"><Users size={18} className="text-blue-500" /> รายชื่อนักเรียน</h5><button onClick={onPrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95"><Printer size={16} /> พิมพ์รายงาน</button></div>
        <div className="overflow-x-auto rounded-xl border border-gray-100"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]"><tr><th className="p-4 border-b">รหัส</th><th className="p-4 border-b">ชื่อ-สกุล</th><th className="p-4 border-b text-center">ผลประเมิน</th><th className="p-4 border-b text-center">จัดการ</th></tr></thead><tbody className="divide-y divide-gray-50">{clubStudents.map((s: Student, idx: number) => (<tr key={s.id} className="hover:bg-blue-50/30 transition-colors"><td className="p-4 font-mono font-bold text-blue-600">{s.id}</td><td className="p-4 font-bold text-gray-700">{s.name} <span className="ml-2 font-normal text-xs text-gray-400">({s.level}/{s.room})</span></td><td className="p-4"><div className="flex justify-center gap-3"><label className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${s.grade === 'ผ' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white text-gray-400 grayscale'}`}><input type="radio" checked={s.grade === 'ผ'} onChange={() => onGradeUpdate(s.id, 'ผ')} className="hidden"/>ผ่าน</label><label className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${s.grade === 'มผ' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white text-gray-400 grayscale'}`}><input type="radio" checked={s.grade === 'มผ'} onChange={() => onGradeUpdate(s.id, 'มผ')} className="hidden"/>ไม่ผ่าน</label></div></td><td className="p-4 text-center"><div className="flex justify-center gap-1"><button onClick={() => handleEditStudent(s)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={18}/></button><button onClick={() => onStudentDelete(s.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"><XCircle size={18}/></button></div></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
};

export default App;
