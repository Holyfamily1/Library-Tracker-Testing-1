
import { Patron, AcademicLevel, Program, PatronCategory } from './types';

export const MOCK_STUDENTS: Patron[] = [
  { id: 'ST-001', category: 'Student', firstName: 'John', surname: 'Doe', name: 'John Doe', email: 'john@example.com', phone: '0240000001', level: 'Level 100', program: 'General Nursing', photo: 'https://picsum.photos/seed/john/200', totalHours: 45.5 },
  { id: 'ST-002', category: 'Student', firstName: 'Jane', surname: 'Smith', name: 'Jane Smith', email: 'jane@example.com', phone: '0240000002', level: 'Level 200', program: 'Registered Midwifery', photo: 'https://picsum.photos/seed/jane/200', totalHours: 62.0 },
  { id: 'AS-001', category: 'Academic Staff', firstName: 'Robert', surname: 'Brown', name: 'Robert Brown', email: 'robert@example.com', phone: '0240000003', department: 'Nursing Science', photo: 'https://picsum.photos/seed/rob/200', totalHours: 28.5 },
  { id: 'NAS-001', category: 'Non-Academic Staff', firstName: 'Emily', surname: 'Davis', name: 'Emily Davis', email: 'emily@example.com', phone: '0240000004', department: 'Administration', photo: 'https://picsum.photos/seed/emily/200', totalHours: 89.2 },
  { id: 'EV-001', category: 'External Visitor', firstName: 'Michael', surname: 'Wilson', name: 'Michael Wilson', email: 'mike@example.com', phone: '0240000005', ghanaCardId: 'GHA-123456789-0', photo: 'https://picsum.photos/seed/mike/200', totalHours: 12.0 },
];

export const ACADEMIC_LEVELS: AcademicLevel[] = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];
export const PROGRAMS: Program[] = ['General Nursing', 'Registered Midwifery'];
export const PATRON_CATEGORIES: PatronCategory[] = ['Student', 'Academic Staff', 'Non-Academic Staff', 'External Visitor'];
export const DEPARTMENTS = ['Nursing Science', 'Midwifery', 'Anatomy', 'Clinical Practice', 'Administration', 'IT Services', 'Library'];

export const THEME = {
  primary: 'bg-indigo-900',
  secondary: 'bg-amber-600',
  accent: 'bg-slate-100',
  text: 'text-indigo-900',
  border: 'border-indigo-100',
};
