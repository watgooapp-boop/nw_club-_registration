
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
  FileUp,
  MapPinned,
  Info,
  UserPlus,
  Trash2,
  Pin,
  ListChecks
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
  const [previewTeachersList, setPreviewTeachersList] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Home Tab State
  const [popularLimit, setPopularLimit] = useState<number>(10);

  // Admin Filter States
  const [adminFilterDept, setAdminFilterDept] = useState('ทั้งหมด');
  const [adminFilterClub, setAdminFilterClub] = useState('');
  const [adminSortOrder, setAdminSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Auth States
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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

  const popularClubs = useMemo(() => {
    const list = [...clubs]
      .map(c => ({
        ...c,
        regCount: students.filter(s => String(s.clubId) === String(c.id)).length
      }))
      .sort((a, b) => b.regCount - a.regCount);
    
    if (popularLimit === -1) return list;
    return list.slice(0, popularLimit);
  }, [clubs, students, popularLimit]);

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
        t.tClubs.some(c => String(c.name) === adminFilterClub)
      );
    }
    
    if (adminSortOrder === 'asc') result.sort((a, b) => a.tRegTotal - b.tRegTotal);
    else if (adminSortOrder === 'desc') result.sort((a, b) => b.tRegTotal - a.tRegTotal);
    
    return result;
  }, [teachers, clubs, students, adminFilterDept, adminFilterClub, adminSortOrder]);

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
    const uniqueNewOnes: Teacher[] = [];
    newTeachers.forEach(t => {
      if (!existingIds.has(String(t.id))) {
        uniqueNewOnes.push(t);
        existingIds.add(String(t.id));
      }
    });
    if (uniqueNewOnes.length > 0) {
      setTeachers(prev => [...prev, ...uniqueNewOnes]);
      Swal.fire('สำเร็จ', `เพิ่มครูสำเร็จ ${uniqueNewOnes.length} คน`, 'success');
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

  // --- Announcement Management ---
  const handleAddAnnouncement = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'เพิ่มประกาศใหม่',
      html: `
        <div class="text-left space-y-3 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">หัวข้อประกาศ</label><input id="ann-title" class="w-full border p-3 rounded-xl text-sm shadow-inner" placeholder="ระบุหัวข้อ"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">รายละเอียด</label><textarea id="ann-content" class="w-full border p-3 rounded-xl text-sm h-24" placeholder="ระบุเนื้อหาประกาศ"></textarea></div>
          <div class="flex items-center gap-2 pt-1"><input type="checkbox" id="ann-pin" class="w-4 h-4 text-blue-600"><label for="ann-pin" class="text-sm font-bold text-gray-600">ปักหมุดประกาศนี้</label></div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'บันทึกประกาศ',
      preConfirm: () => {
        const title = (document.getElementById('ann-title') as HTMLInputElement).value.trim();
        const content = (document.getElementById('ann-content') as HTMLTextAreaElement).value.trim();
        if(!title || !content) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
        return { title, content, isPinned: (document.getElementById('ann-pin') as HTMLInputElement).checked };
      }
    });
    
    if (formValues) {
      const newAnn: Announcement = {
        id: Date.now().toString(),
        title: formValues.title,
        content: formValues.content,
        isPinned: formValues.isPinned,
        isHidden: false,
        date: new Date().toISOString()
      };
      setAnnouncements(prev => [newAnn, ...prev]);
      Swal.fire('สำเร็จ', 'เพิ่มประกาศเรียบร้อยแล้ว', 'success');
    }
  };

  const handleEditAnnouncement = async (ann: Announcement) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขประกาศ',
      html: `
        <div class="text-left space-y-3 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">หัวข้อประกาศ</label><input id="ann-title" class="w-full border p-3 rounded-xl text-sm shadow-inner" value="${ann.title}"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">รายละเอียด</label><textarea id="ann-content" class="w-full border p-3 rounded-xl text-sm h-24">${ann.content}</textarea></div>
          <div class="flex items-center gap-2 pt-1"><input type="checkbox" id="ann-pin" class="w-4 h-4 text-blue-600" ${ann.isPinned ? 'checked' : ''}><label for="ann-pin" class="text-sm font-bold text-gray-600">ปักหมุดประกาศนี้</label></div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      preConfirm: () => {
        const title = (document.getElementById('ann-title') as HTMLInputElement).value.trim();
        const content = (document.getElementById('ann-content') as HTMLTextAreaElement).value.trim();
        if(!title || !content) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
        return { title, content, isPinned: (document.getElementById('ann-pin') as HTMLInputElement).checked };
      }
    });
    
    if (formValues) {
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, ...formValues } : a));
      Swal.fire('สำเร็จ', 'แก้ไขประกาศเรียบร้อยแล้ว', 'success');
    }
  };

  const deleteAnnouncement = (id: string) => {
    Swal.fire({
      title: 'ลบประกาศ?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ'
    }).then(res => {
      if (res.isConfirmed) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        Swal.fire('สำเร็จ', 'ลบประกาศเรียบร้อยแล้ว', 'success');
      }
    });
  };

  const togglePinAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
  };

  const toggleHideAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isHidden: !a.isHidden } : a));
  };

  // --- Registration Rules Management ---
  const handleEditRules = async () => {
    const { value: rulesText } = await Swal.fire({
      title: 'แก้ไขระเบียบการสมัคร',
      html: `
        <div class="text-left space-y-3 p-1">
          <p class="text-[10px] text-blue-500 font-bold bg-blue-50 p-2 rounded">ใส่ระเบียบการบรรทัดละ 1 ข้อ</p>
          <textarea id="rules-input" class="w-full h-48 border p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">${registrationRules.join('\n')}</textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      width: '600px',
      preConfirm: () => (document.getElementById('rules-input') as HTMLTextAreaElement).value
    });

    if (rulesText !== undefined) {
      const newRules = rulesText.split('\n').filter(r => r.trim() !== "");
      setRegistrationRules(newRules);
      Swal.fire('สำเร็จ', 'อัปเดตระเบียบการเรียบร้อยแล้ว', 'success');
    }
  };

  // --- Teacher Print Preview Overlay Component ---
  const TeacherPrintPreviewOverlay = ({ teachersList, onClose }: { teachersList: any[], onClose: () => void }) => {
    const pageSize = 20; // ปรับกลับเป็น 20 ตามที่ผู้ใช้ต้องการ
    const pageCount = Math.max(1, Math.ceil(teachersList.length / pageSize));
    const pages = Array.from({ length: pageCount }, (_, i) => teachersList.slice(i * pageSize, (i + 1) * pageSize));

    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto no-print-backdrop">
        <div className="flex justify-center gap-4 mb-6 w-full max-w-4xl print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
          >
            <Printer size={20} /> พิมพ์รายงานครู / บันทึกเป็น PDF
          </button>
          <button 
            onClick={onClose}
            className="bg-white text-gray-700 px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 shadow-lg border active:scale-95 transition-all"
          >
            <XCircle size={20} /> ปิดตัวอย่าง
          </button>
        </div>

        <div id="print-content" className="flex flex-col gap-0 bg-transparent">
          {pages.map((teacherChunk, pageIdx) => (
            <div key={pageIdx} className="a4-page bg-white relative overflow-hidden mb-10 print:mb-0 shadow-2xl print:shadow-none">
              <div className="absolute top-2 right-6 text-[8px] text-gray-400 font-bold print:top-2 print:right-6">
                หน้า {pageIdx + 1} / {pageCount}
              </div>

              <div className="p-8 h-full flex flex-col print:p-6">
                <div className="flex flex-col items-center justify-center gap-2 mb-4 border-b-2 border-black pb-3">
                  <img src={SCHOOL_LOGO} alt="School Logo" className="h-20 w-auto mb-1" />
                  <div className="text-center">
                    <h1 className="text-base font-bold text-black leading-tight uppercase">รายงานรายชื่อบุคลากรครูที่ปรึกษาชุมนุม</h1>
                    <h2 className="text-sm font-bold text-gray-800">โรงเรียนหนองบัวแดงวิทยา</h2>
                    <p className="text-[10px] font-medium text-gray-700">ประจำปีการศึกษา 2568</p>
                  </div>
                </div>
                
                <table className="w-full border-collapse border border-black text-xs mb-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-0.5 w-10 text-center text-[10px]">ลำดับ</th>
                      <th className="border border-black p-0.5 w-20 text-center text-[10px]">รหัสครู</th>
                      <th className="border border-black p-0.5 text-left text-[10px] px-2 w-[25%]">ชื่อ-นามสกุล</th>
                      <th className="border border-black p-0.5 w-32 text-center text-[10px]">กลุ่มสาระ</th>
                      <th className="border border-black p-0.5 text-left text-[10px] px-2">ชุมนุมที่รับผิดชอบ</th>
                      <th className="border border-black p-0.5 w-16 text-center text-[10px]">นร.รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherChunk.map((t, idx) => (
                      <tr key={t.id} className="h-7">
                        <td className="border border-black p-0.5 text-center text-[10px]">{(pageIdx * pageSize) + idx + 1}</td>
                        <td className="border border-black p-0.5 text-center font-mono text-[10px]">{t.id}</td>
                        <td className="border border-black p-0.5 px-2 text-left text-[10px]">{t.name}</td>
                        <td className="border border-black p-0.5 text-center text-[10px]">{t.department}</td>
                        <td className="border border-black p-0.5 px-2 text-left text-[9px]">
                          {t.tClubs.length > 0 ? t.tClubs.map((c: any) => c.name).join(', ') : '-'}
                        </td>
                        <td className="border border-black p-0.5 text-center text-[10px] font-bold">{t.tRegTotal}</td>
                      </tr>
                    ))}
                    {teacherChunk.length < pageSize && Array.from({ length: pageSize - teacherChunk.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-7">
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageIdx === pageCount - 1 && (
                  <div className="mt-8 flex justify-around items-end pb-4">
                    <div className="text-center">
                      <div className="mb-4 border-b border-black w-48 mx-auto"></div>
                      <p className="font-bold text-[10px]">(ลงชื่อ)......................................................</p>
                      <p className="mt-1 font-medium text-[10px]">หัวหน้ากิจกรรมพัฒนาผู้เรียน</p>
                    </div>
                    <div className="text-center">
                      <div className="mb-4 border-b border-black w-48 mx-auto"></div>
                      <p className="font-bold text-[10px]">(ลงชื่อ)......................................................</p>
                      <p className="mt-1 font-medium text-[10px]">ผู้บริหารโรงเรียน</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-2 text-[7px] text-gray-400 italic text-right">
                  พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Print Preview Overlay Component ---
  const PrintPreviewOverlay = ({ club, onClose }: { club: Club, onClose: () => void }) => {
    const clubStudents = useMemo(() => students
      .filter(s => String(s.clubId) === String(club.id))
      .sort((a, b) => String(a.level).localeCompare(String(b.level)) || String(a.room).localeCompare(String(b.room)) || parseInt(a.seatNumber) - parseInt(b.seatNumber)),
    [students, club.id]);

    const advisor = teachers.find(t => String(t.id) === String(club.advisorId));
    const coAdvisor = club.coAdvisorId ? teachers.find(t => String(t.id) === String(club.coAdvisorId)) : null;

    const stats = {
      total: clubStudents.length,
      passed: clubStudents.filter(s => s.grade === 'ผ').length,
      failed: clubStudents.filter(s => s.grade === 'มผ').length,
      pending: clubStudents.filter(s => s.grade === null).length
    };

    const pageSize = 25; // ปรับกลับเป็น 25 ตามเดิม
    const pageCount = Math.max(1, Math.ceil(clubStudents.length / pageSize));
    const pages = Array.from({ length: pageCount }, (_, i) => clubStudents.slice(i * pageSize, (i + 1) * pageSize));

    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto no-print-backdrop">
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
            <div key={pageIdx} className="a4-page bg-white relative overflow-hidden mb-10 print:mb-0 shadow-2xl print:shadow-none">
              <div className="absolute top-2 right-6 text-[8px] text-gray-400 font-bold print:top-2 print:right-6">
                หน้า {pageIdx + 1} / {pageCount}
              </div>

              <div className="p-8 h-full flex flex-col print:p-6">
                {pageIdx === 0 ? (
                  <div className="flex items-center justify-center gap-4 mb-3 border-b border-black pb-2">
                    <img src={SCHOOL_LOGO} alt="School Logo" className="h-14 w-auto shrink-0" />
                    <div className="text-center">
                      <h1 className="text-sm font-bold text-black leading-tight">บัญชีรายชื่อนักเรียนและผลการประเมินกิจกรรมชุมนุม</h1>
                      <h2 className="text-xs font-bold text-gray-800">ชื่อชุมนุม: {club.name} ({club.type})</h2>
                      <p className="text-[10px] font-medium text-gray-700">โรงเรียนหนองบัวแดงวิทยา</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-2 border-b border-black pb-1">
                    <h1 className="text-xs font-bold">บัญชีรายชื่อนักเรียนชุมนุม {club.name} (ต่อ) หน้า {pageIdx + 1}</h1>
                  </div>
                )}
                
                {pageIdx === 0 && (
                  <div className="flex justify-center gap-8 text-[9px] font-bold mb-3 italic">
                    <p>ครูที่ปรึกษาหลัก: {advisor?.name || club.advisorId}</p>
                    {coAdvisor && <p>ครูที่ปรึกษาร่วม: {coAdvisor.name}</p>}
                  </div>
                )}

                <table className="w-full border-collapse border border-black text-xs mb-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-0.5 w-8 text-center text-[10px]">ลำดับ</th>
                      <th className="border border-black p-0.5 w-20 text-center text-[10px]">รหัสประจำตัว</th>
                      <th className="border border-black p-0.5 text-left text-[10px] px-2">ชื่อ-นามสกุล</th>
                      <th className="border border-black p-0.5 w-14 text-center text-[10px]">ชั้น/ห้อง</th>
                      <th className="border border-black p-0.5 w-20 text-center text-[10px]">ผลประเมิน</th>
                      <th className="border border-black p-0.5 w-24 text-center text-[10px]">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentChunk.map((s, idx) => (
                      <tr key={s.id} className="h-7">
                        <td className="border border-black p-0.5 text-center text-[10px]">{(pageIdx * pageSize) + idx + 1}</td>
                        <td className="border border-black p-0.5 text-center font-mono text-[10px]">{s.id}</td>
                        <td className="border border-black p-0.5 px-2 text-left text-[10px]">{s.name}</td>
                        <td className="border border-black p-0.5 text-center text-[10px]">{s.level}/{s.room}</td>
                        <td className="border border-black p-0.5 text-center font-bold text-[10px]">
                          {s.grade === 'ผ' ? 'ผ่าน' : s.grade === 'มผ' ? 'ไม่ผ่าน' : '-'}
                        </td>
                        <td className="border border-black p-0.5"></td>
                      </tr>
                    ))}
                    {studentChunk.length < pageSize && Array.from({ length: pageSize - studentChunk.length }).map((_, i) => (
                      <tr key={`empty-${pageIdx}-${i}`} className="h-7">
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                        <td className="border border-black p-0.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageIdx === pageCount - 1 && (
                  <div className="mt-4">
                    <div className="p-2 border border-black rounded-lg mb-4 print:rounded-none">
                      <h4 className="font-bold text-[10px] mb-1 border-b border-black pb-0.5 flex items-center gap-2 uppercase tracking-tighter">
                        <FileText size={12} /> สรุปผลการดำเนินงาน
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px]">
                        <div className="flex justify-between border-b border-dotted border-gray-400">
                          <span>จำนวนนักเรียนทั้งหมด:</span>
                          <span className="font-bold">{stats.total} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-400">
                          <span>ประเมินผ่าน (ผ):</span>
                          <span className="font-bold text-green-700">{stats.passed} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-400">
                          <span>ประเมินไม่ผ่าน (มผ):</span>
                          <span className="font-bold text-red-600">{stats.failed} คน</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-400">
                          <span>ยังไม่ได้ประเมิน:</span>
                          <span className="font-bold text-gray-500">{stats.pending} คน</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-around items-end">
                      <div className="text-center">
                        <p className="font-bold text-[10px] mb-4">(ลงชื่อ)......................................................</p>
                        <p className="text-[10px] font-bold">({advisor?.name || '........................................'})</p>
                        <p className="mt-0.5 font-medium text-[9px]">ครูที่ปรึกษา</p>
                      </div>
                      {coAdvisor && (
                        <div className="text-center">
                          <p className="font-bold text-[10px] mb-4">(ลงชื่อ)......................................................</p>
                          <p className="text-[10px] font-bold">({coAdvisor.name})</p>
                          <p className="mt-0.5 font-medium text-[9px]">ครูที่ปรึกษาร่วม</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-2 text-[7px] text-gray-400 italic text-right">
                  พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
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
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={<School className="text-blue-500" />} title="จำนวนชุมนุมทั้งหมด" value={clubs.length} unit="ชุมนุม" />
        <StatCard icon={<Users className="text-green-500" />} title="จำนวนการสมัครทั้งหมด" value={students.length} unit="คน" />
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-purple-900">
            <BarChart3 className="text-purple-500" />
            อันดับชุมนุมยอดนิยม
          </h2>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border">
            <label className="text-xs font-bold text-gray-400 uppercase">แสดงผล:</label>
            <select 
              className="text-sm font-bold bg-transparent outline-none cursor-pointer text-purple-700"
              value={popularLimit}
              onChange={(e) => setPopularLimit(parseInt(e.target.value))}
            >
              <option value="5">5 อันดับแรก</option>
              <option value="10">10 อันดับแรก</option>
              <option value="20">20 อันดับแรก</option>
              <option value="-1">ชุมนุมทั้งหมด</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">ชื่อชุมนุม</th>
                <th className="p-4">ประเภท</th>
                <th className="p-4 text-center">นักเรียน / แผนรับ</th>
                <th className="p-4 w-40 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {popularClubs.map((club, idx) => {
                const percent = (club.regCount / club.capacity) * 100;
                return (
                  <tr key={club.id} className="hover:bg-purple-50/30 transition-colors group">
                    <td className="p-4 text-center font-black text-gray-300 group-hover:text-purple-600 transition-colors">{idx + 1}</td>
                    <td className="p-4 font-bold text-gray-800">{club.name}</td>
                    <td className="p-4 text-xs font-medium text-gray-500 uppercase tracking-tight">{club.type}</td>
                    <td className="p-4 text-center font-mono font-bold">
                      <span className={club.regCount >= club.capacity ? 'text-red-500' : 'text-blue-600'}>{club.regCount}</span> 
                      <span className="text-gray-300 mx-1">/</span>
                      <span className="text-gray-400">{club.capacity}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-center">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${club.regCount >= club.capacity ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase">
                          {club.regCount >= club.capacity ? 'CLOSED' : `${Math.floor(percent)}% FULL`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={28} /></div>
            <div>
              <h2 className="font-bold text-xl">ครู{foundTeacher.name}</h2>
              <p className="text-sm text-gray-600 font-bold">รหัส: <span className="text-blue-600">{foundTeacher.id}</span> | กลุ่มสาระ: {foundTeacher.department}</p>
            </div>
          </div>
          <button onClick={() => { setLoggedInTeacher(null); setFoundTeacher(null); }} className="text-red-500 font-bold flex items-center gap-1"><LogOut size={18} /> ออกจากระบบ</button>
        </div>
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
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings /> จัดการระบบผู้ดูแล</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsSystemOpen(!isSystemOpen)} className={`px-6 py-2 rounded-xl font-bold text-white ${isSystemOpen ? 'bg-red-500' : 'bg-green-500'}`}>
              {isSystemOpen ? 'ปิดรับสมัคร' : 'เปิดรับสมัคร'}
            </button>
            <button onClick={() => setIsAdminLoggedIn(false)} className="bg-gray-100 p-2 rounded-xl text-gray-600 hover:text-red-500 transition-colors">
              <LogOut size={20}/>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Users className="text-blue-500"/>} title="ครูทั้งหมด" value={teachers.length} unit="คน" />
          <StatCard icon={<Users className="text-green-500"/>} title="สมัครแล้ว" value={students.length} unit="คน" />
          <StatCard icon={<School className="text-purple-500"/>} title="ชุมนุมทั้งหมด" value={clubs.length} unit="ชุมนุม" />
        </div>

        {/* จัดการระเบียบการ */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900"><ListChecks size={22} /> จัดการระเบียบการสมัคร</h3>
            <button onClick={handleEditRules} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-blue-700 transition-all active:scale-95">
              <Pencil size={16} /> แก้ไขระเบียบการ
            </button>
          </div>
          <ul className="list-decimal list-inside space-y-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-dashed">
            {registrationRules.length === 0 ? <li className="text-gray-400 italic">ยังไม่มีระเบียบการ</li> : registrationRules.map((rule, idx) => <li key={idx}>{rule}</li>)}
          </ul>
        </section>

        {/* ระบบจัดการประกาศ */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Megaphone size={22} /> จัดการประกาศ</h3>
            <button onClick={handleAddAnnouncement} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-blue-700 transition-all active:scale-95">
              <PlusCircle size={16} /> เพิ่มประกาศ
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-inner">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
                <tr>
                  <th className="p-4">วันที่</th>
                  <th className="p-4">หัวข้อประกาศ</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {announcements.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">ยังไม่มีประกาศ</td></tr>
                ) : announcements.map(ann => (
                  <tr key={ann.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="p-4 text-xs text-gray-400">{new Date(ann.date).toLocaleDateString('th-TH')}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800 flex items-center gap-2">
                        {ann.isPinned && <Pin size={12} className="text-red-500" />}
                        {ann.title}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-md">{ann.content}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {ann.isPinned && <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">PINNED</span>}
                        {ann.isHidden && <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">HIDDEN</span>}
                        {!ann.isPinned && !ann.isHidden && <span className="bg-green-100 text-green-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">ACTIVE</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => togglePinAnnouncement(ann.id)} className={`p-2 rounded-lg transition-colors ${ann.isPinned ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600'}`} title="ปักหมุด/ถอนหมุด"><Pin size={14}/></button>
                        <button onClick={() => toggleHideAnnouncement(ann.id)} className={`p-2 rounded-lg transition-colors ${ann.isHidden ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`} title="ซ่อน/แสดง">{ann.isHidden ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                        <button onClick={() => handleEditAnnouncement(ann)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="แก้ไขประกาศ"><Pencil size={14}/></button>
                        <button onClick={() => deleteAnnouncement(ann.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="ลบประกาศ"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* จัดการข้อมูลครู */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900"><UserPen size={22} /> จัดการข้อมูลครู</h3>
            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              <div className="flex bg-gray-50 border rounded-xl overflow-hidden shadow-inner h-10">
                <span className="bg-gray-100 p-2.5 text-gray-400 border-r flex items-center"><Filter size={16} /></span>
                <select 
                  className="bg-transparent text-xs font-bold px-3 py-1 outline-none text-gray-600"
                  value={adminFilterDept}
                  onChange={(e) => setAdminFilterDept(e.target.value)}
                >
                  <option value="ทั้งหมด">ทุกกลุ่มสาระ</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex bg-gray-50 border rounded-xl overflow-hidden shadow-inner flex-1 md:flex-none h-10">
                <span className="bg-gray-100 p-2.5 text-gray-400 border-r flex items-center"><Search size={16} /></span>
                <select 
                  className="bg-transparent text-xs px-3 py-1 outline-none w-full text-gray-600 font-bold"
                  value={adminFilterClub}
                  onChange={(e) => setAdminFilterClub(e.target.value)}
                >
                  <option value="">ค้นหาตามชุมนุม...</option>
                  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={() => setPreviewTeachersList(true)} className="bg-gray-800 text-white px-4 h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-black transition-all active:scale-95">
                <Printer size={16} /> พิมพ์ข้อมูลครู
              </button>
              <button onClick={handleRegisterTeacherModal} className="bg-green-600 text-white px-4 h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-green-700 transition-all active:scale-95">
                <PlusCircle size={16} /> เพิ่มครู
              </button>
              <button onClick={handleBulkRegisterTeacherModal} className="bg-indigo-600 text-white px-4 h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-indigo-700 transition-all active:scale-95">
                <UserPlus size={16} /> เพิ่มครูหลายคน
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-inner">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
                <tr>
                  <th className="p-4 w-20 text-center">รหัส</th>
                  <th className="p-4">ชื่อ-นามสกุล</th>
                  <th className="p-4">กลุ่มสาระ</th>
                  <th className="p-4">ชุมนุมที่รับผิดชอบ</th>
                  <th className="p-4 text-center">
                    <button 
                      onClick={() => setAdminSortOrder(adminSortOrder === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 mx-auto hover:text-blue-600 transition-colors"
                    >
                      นร. ทั้งหมด
                      {adminSortOrder === 'asc' ? <ArrowUpNarrowWide size={14}/> : <ArrowDownWideNarrow size={14}/>}
                    </button>
                  </th>
                  <th className="p-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedTeachers.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 text-center text-gray-400 italic">ไม่พบข้อมูลครูที่ตรงตามเงื่อนไข</td></tr>
                ) : filteredAndSortedTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 text-center font-mono text-xs font-bold text-gray-400 group-hover:text-blue-500">{t.id}</td>
                    <td className="p-4 font-bold text-gray-800">{t.name}</td>
                    <td className="p-4 text-xs font-medium text-gray-500">{t.department}</td>
                    <td className="p-4">
                      {t.tClubs.length === 0 ? (
                        <span className="text-[10px] text-gray-300 italic">ยังไม่มีชุมนุม</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {t.tClubs.map(c => (
                            <span key={c.id} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">{c.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${t.tRegTotal > 0 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400'}`}>
                        {t.tRegTotal} คน
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditTeacherModal(t)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="แก้ไข"><Pencil size={16}/></button>
                        <button onClick={() => handleDeleteTeacher(t.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="ลบ"><Trash2 size={16}/></button>
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
  };

  const handleRegisterTeacherModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'ลงทะเบียนครูใหม่', 
      html: `
        <div class="text-left space-y-4 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">รหัสครู 4 หลัก</label><input id="t-id" class="w-full border p-3 rounded-xl text-sm shadow-inner" placeholder="เช่น t123"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ชื่อ-นามสกุล</label><input id="t-name" class="w-full border p-3 rounded-xl text-sm shadow-inner" placeholder="ไม่ต้องใส่คำนำหน้า"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">กลุ่มสาระการเรียนรู้</label><select id="t-dept" class="w-full border p-3 rounded-xl text-sm shadow-inner">${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}</select></div>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'บันทึกข้อมูล',
      confirmButtonColor: '#059669',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        const id = (document.getElementById('t-id') as HTMLInputElement).value.trim();
        const name = (document.getElementById('t-name') as HTMLInputElement).value.trim();
        if(!id || !name) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
        return { id, name, department: (document.getElementById('t-dept') as HTMLSelectElement).value }
      }
    });
    if (formValues) handleAddTeacher(formValues);
  };

  const handleBulkRegisterTeacherModal = async () => {
    const { value: bulkText } = await Swal.fire({
      title: 'เพิ่มครูหลายคน', 
      html: `
        <div class="text-left space-y-4 p-1">
          <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <h4 class="text-[10px] font-black text-indigo-800 uppercase mb-2 flex items-center gap-1.5"><Info size={12}/> รูปแบบการนำเข้าข้อมูล</h4>
            <p class="text-[10px] text-indigo-600 font-medium leading-relaxed">
              รหัสครู, ชื่อ-นามสกุล, กลุ่มสาระ <br/>
              <b>ตัวอย่าง:</b> t001, นายสมชาย ใจดี, คณิตศาสตร์ <br/>
              * บรรทัดละ 1 คน ชื่อกลุ่มสาระต้องตรงกับในระบบ
            </p>
          </div>
          <textarea id="bulk-t" class="w-full h-56 border p-4 rounded-2xl text-xs font-mono focus:ring-4 focus:ring-indigo-100 outline-none shadow-inner bg-gray-50/50" placeholder="คัดลอกข้อมูลมาวางที่นี่..."></textarea>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'นำเข้าข้อมูลครู',
      confirmButtonColor: '#4f46e5',
      cancelButtonText: 'ยกเลิก',
      width: '650px',
      preConfirm: () => {
        const text = (document.getElementById('bulk-t') as HTMLTextAreaElement).value;
        const result = text.split('\n')
          .filter(line => line.trim() !== "")
          .map(line => { 
            const parts = line.split(',').map(s => s.trim());
            if (parts.length < 3) return null;
            const [id, name, dept] = parts; 
            return { id, name, department: dept }; 
          })
          .filter(t => t && t.id && t.name && DEPARTMENTS.includes(t.department));
        
        if (result.length === 0 && text.trim() !== "") {
          Swal.showValidationMessage('ไม่พบข้อมูลที่ถูกต้องตามรูปแบบที่กำหนด');
          return false;
        }
        return result;
      }
    });
    if (bulkText && bulkText.length > 0) handleBulkAddTeachers(bulkText as Teacher[]);
  };

  const handleEditTeacherModal = async (teacher: Teacher) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขข้อมูลครู', 
      html: `
        <div class="text-left space-y-3 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">รหัสครู</label><input id="t-id" class="w-full border p-3 rounded-xl text-sm bg-gray-50" value="${teacher.id}" readonly></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">ชื่อ-นามสกุล</label><input id="t-name" class="w-full border p-3 rounded-xl text-sm" value="${teacher.name}"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 block mb-1">กลุ่มสาระ</label><select id="t-dept" class="w-full border p-3 rounded-xl text-sm">${DEPARTMENTS.map(d => `<option value="${d}" ${teacher.department === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'อัปเดตข้อมูล',
      confirmButtonColor: '#2563eb',
      preConfirm: () => ({ 
        id: (document.getElementById('t-id') as HTMLInputElement).value.trim(), 
        name: (document.getElementById('t-name') as HTMLInputElement).value.trim(), 
        department: (document.getElementById('t-dept') as HTMLSelectElement).value 
      })
    });
    if (formValues) handleUpdateTeacher(teacher.id, formValues);
  };

  const openCreateClubModal = (teacher: Teacher) => {
    const availableCoAdvisors = teachers.filter(t => 
      t.id !== teacher.id && 
      !clubs.some(c => String(c.advisorId) === String(t.id) || String(c.coAdvisorId) === String(t.id))
    );

    Swal.fire({
      title: 'สร้างชุมนุมใหม่', 
      html: `
        <div class="text-left space-y-4 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ชื่อชุมนุม</label><input id="c-name" class="w-full border p-3 rounded-xl text-sm" placeholder="ระบุชื่อชุมนุม"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ประเภท</label><select id="c-type" class="w-full border p-3 rounded-xl text-sm">${Object.values(ClubType).map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
            <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ระดับชั้น</label><select id="c-target" class="w-full border p-3 rounded-xl text-sm">${Object.values(LevelCategory).map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
          </div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">สถานที่เรียน / ห้องเรียน</label><input id="c-loc" class="w-full border p-3 rounded-xl text-sm" placeholder="เช่น ห้อง 111 หรือ สนามฟุตบอล"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">รายละเอียด / คำอธิบายสั้นๆ</label><textarea id="c-desc" class="w-full border p-3 rounded-xl text-sm h-24" placeholder="ระบุสิ่งที่นักเรียนจะได้เรียนรู้ หรือคุณสมบัติผู้สมัคร"></textarea></div>
          <div>
            <label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ครูที่ปรึกษาร่วม (ถ้ามี)</label>
            <select id="c-co" class="w-full border p-3 rounded-xl text-sm">
              <option value="">-- ไม่มีครูที่ปรึกษาร่วม --</option>
              ${availableCoAdvisors.map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join('')}
            </select>
          </div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">เบอร์โทรศัพท์ติดต่อ</label><input id="c-phone" type="text" class="w-full border p-3 rounded-xl text-sm" placeholder="เช่น 0812345678"></div>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'ยืนยันสร้างชุมนุม',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const name = (document.getElementById('c-name') as HTMLInputElement).value.trim();
        if(!name) { Swal.showValidationMessage('กรุณาระบุชื่อชุมนุม'); return false; }
        return { 
          name, 
          type: (document.getElementById('c-type') as HTMLSelectElement).value, 
          levelTarget: (document.getElementById('c-target') as HTMLSelectElement).value, 
          location: (document.getElementById('c-loc') as HTMLInputElement).value, 
          advisorId: teacher.id, 
          coAdvisorId: (document.getElementById('c-co') as HTMLSelectElement).value || undefined,
          capacity: 25, 
          description: (document.getElementById('c-desc') as HTMLTextAreaElement).value.trim(), 
          phone: (document.getElementById('c-phone') as HTMLInputElement).value.trim() 
        }
      }
    }).then(res => { if (res.isConfirmed) handleCreateClub(res.value); });
  };

  const openUpdateClubModal = (club: Club, teacher: Teacher) => {
    const availableCoAdvisors = teachers.filter(t => 
      t.id !== club.advisorId && 
      (!clubs.some(c => (String(c.advisorId) === String(t.id) || String(c.coAdvisorId) === String(t.id)) && String(c.id) !== String(club.id)) || String(t.id) === String(club.coAdvisorId))
    );

    Swal.fire({
      title: 'แก้ไขข้อมูลชุมนุม', 
      html: `
        <div class="text-left space-y-4 p-1">
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ชื่อชุมนุม</label><input id="c-name" class="w-full border p-3 rounded-xl text-sm font-bold" value="${club.name}"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">สถานที่เรียน</label><input id="c-loc" class="w-full border p-3 rounded-xl text-sm" value="${club.location}"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">คำอธิบาย</label><textarea id="c-desc" class="w-full border p-3 rounded-xl text-sm h-24">${club.description || ''}</textarea></div>
          <div>
            <label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">ครูที่ปรึกษาร่วม</label>
            <select id="c-co" class="w-full border p-3 rounded-xl text-sm">
              <option value="">-- ไม่มีครูที่ปรึกษาร่วม --</option>
              ${availableCoAdvisors.map(t => `<option value="${t.id}" ${club.coAdvisorId === t.id ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
            </select>
          </div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">เบอร์โทรศัพท์ติดต่อ</label><input id="c-phone" type="text" class="w-full border p-3 rounded-xl text-sm" value="${club.phone || ''}" placeholder="เช่น 0812345678"></div>
          <div><label class="text-[10px] font-black uppercase text-gray-400 mb-1 block">จำนวนรับสมัคร (คน)</label><input id="c-cap" type="number" class="w-full border p-3 rounded-xl text-sm" value="${club.capacity}"></div>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'บันทึกการเปลี่ยนแปลง',
      confirmButtonColor: '#2563eb',
      preConfirm: () => ({ 
        ...club, 
        name: (document.getElementById('c-name') as HTMLInputElement).value.trim(), 
        location: (document.getElementById('c-loc') as HTMLInputElement).value.trim(),
        description: (document.getElementById('c-desc') as HTMLTextAreaElement).value.trim(),
        coAdvisorId: (document.getElementById('c-co') as HTMLSelectElement).value || undefined,
        phone: (document.getElementById('c-phone') as HTMLInputElement).value.trim(),
        capacity: parseInt((document.getElementById('c-cap') as HTMLInputElement).value) || 25
      })
    }).then(res => { if (res.isConfirmed) handleUpdateClub(res.value); });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <style>{`
        /* A4 Preview Screen Styles */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          margin: 0 auto;
          box-sizing: border-box;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          border-radius: 4px;
        }

        /* Improved Surgical Print Styles */
        @media print {
          /* ซ่อนทุกอย่างยกเว้นส่วนที่จะพิมพ์ */
          body * {
            visibility: hidden !important;
          }
          #print-content, #print-content * {
            visibility: visible !important;
          }
          #print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          @page { 
            size: A4; 
            margin: 10mm; 
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 5mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          /* หน้าสุดท้ายห้ามขึ้นหน้าเปล่า */
          .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: black !important;
          }

          table, th, td {
            border-color: black !important;
          }
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
      {previewTeachersList && <TeacherPrintPreviewOverlay teachersList={filteredAndSortedTeachers} onClose={() => setPreviewTeachersList(false)} />}
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
  const coAdvisor = club.coAdvisorId ? teachers.find((t: Teacher) => String(t.id) === String(club.coAdvisorId)) : null;
  const badgeColor = isFull ? 'bg-red-100 text-red-700' : percent >= 80 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
  
  return (
    <div className="group rounded-2xl border-2 transition-all overflow-hidden flex flex-col h-full hover:shadow-xl bg-white border-gray-100">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${badgeColor}`}>{club.type}</span>
          {isFull && <span className="bg-red-500 text-white font-black text-[10px] px-2 py-1 rounded uppercase animate-pulse">เต็มแล้ว</span>}
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-900 transition-colors">{club.name}</h3>
        
        {/* รายละเอียดเพิ่มเติม */}
        {club.description && (
          <div className="flex items-start gap-1.5 my-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-dashed">
            <Info size={14} className="mt-0.5 shrink-0 text-blue-400" />
            <p className="line-clamp-3 leading-relaxed">{club.description}</p>
          </div>
        )}

        <div className="space-y-1.5 mb-6 mt-auto pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <UserPen size={14} className="text-blue-500 shrink-0" />
            <span>ครูที่ปรึกษาหลัก: <b>{advisor?.name || '-'}</b></span>
          </div>
          {coAdvisor && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Users size={14} className="text-indigo-500 shrink-0" />
              <span>ครูที่ปรึกษาร่วม: <b>{coAdvisor.name}</b></span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPinned size={14} className="text-orange-400 shrink-0" />
            <span>สถานที่เรียน: <b>{club.location}</b></span>
          </div>
          {club.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone size={14} className="text-green-500 shrink-0" />
              <span>ติดต่อ: <b>{club.phone}</b></span>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-1.5 font-black uppercase text-gray-400 tracking-widest">
            <span>ความจุที่เปิดรับ</span>
            <span className={isFull ? 'text-red-500' : 'text-blue-600'}>{count} / {club.capacity}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-700 ${isFull ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-green-500'}`} 
              style={{ width: `${Math.min(100, percent)}%` }} 
            />
          </div>
        </div>
      </div>
      <button 
        disabled={disabled || isFull} 
        onClick={onRegister} 
        className={`w-full py-4 text-center font-bold text-sm tracking-wide transition-all active:scale-95 ${isFull || disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-inner'}`}
      >
        {isFull ? 'สมัครไม่ได้เนื่องจากสมาชิกเต็ม' : 'กดปุ่มเพื่อสมัครชุมนุมนี้'}
      </button>
    </div>
  );
};

const ClubManagementCard = ({ club, students, teachers, isLeadAdvisor, onUpdate, onDelete, onGradeUpdate, onStudentDelete, onStudentUpdate, onPrint }: any) => {
  const clubStudents = students.filter((s: Student) => String(s.clubId) === String(club.id)).sort((a: Student, b: Student) => parseInt(a.seatNumber) - parseInt(b.seatNumber));
  
  const handleEditStudent = async (student: Student) => {
    const { value: formValues } = await Swal.fire({
      title: 'แก้ไขข้อมูลนักเรียน', 
      html: `
        <div class="text-left space-y-3 p-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-black uppercase text-gray-400 block mb-1">รหัสประจำตัว (5 หลัก)</label>
              <input id="s-id" class="w-full border p-3 rounded-xl text-sm shadow-inner" value="${student.id}" maxlength="5">
            </div>
            <div>
              <label class="text-[10px] font-black uppercase text-gray-400 block mb-1">เลขที่</label>
              <input id="s-seat" type="number" class="w-full border p-3 rounded-xl text-sm shadow-inner" value="${student.seatNumber}">
            </div>
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-gray-400 block mb-1">ชื่อ-นามสกุล</label>
            <input id="s-name" class="w-full border p-3 rounded-xl text-sm shadow-inner" value="${student.name}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-black uppercase text-gray-400 block mb-1">ระดับชั้น</label>
              <select id="s-level" class="w-full border p-3 rounded-xl text-sm shadow-inner">
                ${['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(l => `<option value="${l}" ${student.level === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-[10px] font-black uppercase text-gray-400 block mb-1">ห้อง</label>
              <select id="s-room" class="w-full border p-3 rounded-xl text-sm shadow-inner">
                ${ROOMS.map(r => `<option value="${r}" ${student.room === r ? 'selected' : ''}>ห้อง ${r}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>`, 
      showCancelButton: true, 
      confirmButtonText: 'บันทึกการแก้ไข',
      preConfirm: () => ({ 
        id: (document.getElementById('s-id') as HTMLInputElement).value.trim(),
        name: (document.getElementById('s-name') as HTMLInputElement).value.trim(), 
        seatNumber: (document.getElementById('s-seat') as HTMLInputElement).value,
        level: (document.getElementById('s-level') as HTMLSelectElement).value,
        room: (document.getElementById('s-room') as HTMLSelectElement).value
      })
    });
    if (formValues) onStudentUpdate(student.id, formValues);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-slate-50 p-6 flex justify-between items-center border-b gap-4">
        <div>
          <h4 className="text-2xl font-bold text-blue-900 leading-tight">{club.name}</h4>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">สถานที่: {club.location} | จำนวน {clubStudents.length} / {club.capacity}</div>
        </div>
        <div className="flex gap-2">
          {isLeadAdvisor && (
            <>
              <button onClick={() => onUpdate(club)} className="bg-white border text-gray-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-100 transition-colors">แก้ไขชุมนุม</button>
              <button onClick={onDelete} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">ลบข้อมูล</button>
            </>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h5 className="font-black text-gray-700 uppercase tracking-widest text-sm flex items-center gap-2"><Users size={18} className="text-indigo-500" /> สมาชิกในชุมนุม</h5>
          <button onClick={onPrint} className="bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl active:scale-95 hover:bg-black transition-all">
            <Printer size={16} /> พิมพ์รายงานผลการประเมิน (PDF)
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-inner">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="p-4 border-b text-center w-20">รหัส นร.</th>
                <th className="p-4 border-b">ชื่อ-สกุล / ชั้นเรียน</th>
                <th className="p-4 border-b text-center">การประเมิน</th>
                <th className="p-4 border-b text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clubStudents.length === 0 ? (
                <tr><td colSpan={4} className="p-16 text-center text-gray-300 italic">ยังไม่มีนักเรียนสมัครเข้าเรียนในชุมนุมนี้</td></tr>
              ) : clubStudents.map((s: Student) => (
                <tr key={s.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="p-4 text-center font-mono font-bold text-blue-600">{s.id}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{s.level}/{s.room} • เลขที่ {s.seatNumber}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => onGradeUpdate(s.id, 'ผ')} 
                        className={`w-10 h-8 rounded-lg text-xs font-black transition-all ${s.grade === 'ผ' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                        title="ให้ผ่าน (ผ)"
                      >ผ</button>
                      <button 
                        onClick={() => onGradeUpdate(s.id, 'มผ')} 
                        className={`w-10 h-8 rounded-lg text-xs font-black transition-all ${s.grade === 'มผ' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                        title="ไม่ผ่าน (มผ)"
                      >มผ</button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditStudent(s)} className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Pencil size={18}/></button>
                      <button onClick={() => onStudentDelete(s.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><XCircle size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
