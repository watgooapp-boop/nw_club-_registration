
export enum ClubType {
  SPORTS = 'กีฬา',
  ARTS = 'ศิลปะ',
  ACADEMIC = 'วิชาการ',
  SERVICE = 'บริการ',
  COMPUTER = 'คอมพิวเตอร์',
  OTHER = 'อื่นๆ'
}

export enum LevelCategory {
  JUNIOR = 'ม.ต้น',
  SENIOR = 'ม.ปลาย',
  BOTH = 'ทั้งต้นและปลาย'
}

export interface Teacher {
  id: string; // 4 chars (1 letter + 3 digits or similar)
  name: string;
  department: string;
}

export interface Student {
  id: string; // 5 digits
  name: string;
  level: string; // ม.1-ม.6
  room: string; // 1-13
  seatNumber: string; // Seat number in class
  clubId: string;
  grade: 'ผ' | 'มผ' | null;
  note?: string;
}

export interface Club {
  id: string;
  name: string;
  type: ClubType;
  description: string;
  levelTarget: LevelCategory;
  capacity: number; // 25 or 50
  location: string;
  phone: string;
  advisorId: string;
  coAdvisorId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isPinned: boolean;
  isHidden?: boolean;
}

export interface AppState {
  teachers: Teacher[];
  students: Student[];
  clubs: Club[];
  announcements: Announcement[];
  isSystemOpen: boolean;
}
