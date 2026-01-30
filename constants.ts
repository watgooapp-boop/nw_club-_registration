
export const DEPARTMENTS = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ'
];

export const ROOMS = Array.from({ length: 13 }, (_, i) => (i + 1).toString());

export const SCHOOL_LOGO = 'https://img5.pic.in.th/file/secure-sv1/nw_logo-removebg.png';
export const ADMIN_PASSWORD = 'admin1234';

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'ยินดีต้อนรับสู่ระบบสมัครชุมนุม',
    content: 'เริ่มเปิดให้ลงทะเบียนภาคเรียนที่ 1/2568 ตั้งแต่วันนี้เป็นต้นไป',
    date: new Date().toISOString(),
    isPinned: true,
    isHidden: false
  }
];
