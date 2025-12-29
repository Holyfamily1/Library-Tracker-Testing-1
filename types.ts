
export type AcademicLevel = 'Level 100' | 'Level 200' | 'Level 300' | 'Level 400';
export type Program = 'General Nursing' | 'Registered Midwifery';
export type PatronCategory = 'Student' | 'Academic Staff' | 'Non-Academic Staff' | 'External Visitor';
export type UserRole = 'admin' | 'librarian';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface Patron {
  id: string;
  category: PatronCategory;
  firstName: string;
  surname: string;
  name: string; // Display name (FirstName Surname)
  email: string;
  phone: string;
  photo?: string; // Optional photo
  totalHours: number;
  // Category specific fields
  level?: AcademicLevel; // For Students
  program?: Program;     // For Students
  department?: string;   // For Staff
  ghanaCardId?: string;  // For External Visitors
}

// Keep Student as an alias or update usages to Patron
export type Student = Patron;

export interface Session {
  id: string;
  studentId: string;
  studentName?: string; 
  checkIn: Date;
  checkOut?: Date;
  duration?: number; // In minutes
  notes?: string;
  alertTriggered?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  email: string;
  thresholdMinutes: number;
}

export interface IdConfig {
  studentPrefix: string;
  academicStaffPrefix: string;
  nonAcademicStaffPrefix: string;
  visitorPrefix: string;
  padding: number;
}

export interface AppSettings {
  dailyCapacity: number;
  aiInsightsEnabled: boolean;
  autoCheckoutEnabled: boolean;
  autoCheckoutHours: number;
  notifications: NotificationSettings;
  idConfig: IdConfig; // New ID generation settings
}

export interface MetricCardData {
  label: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
}

export interface LeaderboardEntry extends Patron {
  rank: number;
  sessionsCount: number;
}
