
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Patron, AcademicLevel, Program, UserRole, PatronCategory, AppSettings } from '../types';
import { ACADEMIC_LEVELS, PROGRAMS, PATRON_CATEGORIES, DEPARTMENTS } from '../constants';
import Modal from './Modal';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';

interface StudentManagementProps {
  students: Patron[];
  onAdd: (student: Patron) => void | Promise<void>;
  onUpdate: (student: Patron) => void | Promise<void>;
  onDelete: (studentId: string) => void;
  userRole: UserRole;
  syncStatus: 'online' | 'syncing' | 'offline' | 'error';
  lastSync: Date;
  onRefresh: () => void;
  appSettings: AppSettings;
}

type SearchType = 'all' | 'name' | 'id';

const PAGE_SIZE = 12;

const StudentManagement: React.FC<StudentManagementProps> = ({ 
  students, 
  userRole,
  syncStatus,
  lastSync,
  onRefresh,
  appSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [levelFilter, setLevelFilter] = useState<AcademicLevel | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<PatronCategory | 'All'>('All');
  
  const [editingStudent, setEditingStudent] = useState<Patron | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Patron | null>(null);
  const [qrStudent, setQrStudent] = useState<Patron | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formCategory, setFormCategory] = useState<PatronCategory>('Student');
  const [formFirstName, setFormFirstName] = useState('');
  const [formSurname, setFormSurname] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLevel, setFormLevel] = useState<AcademicLevel>('Level 100');
  const [formProgram, setFormProgram] = useState<Program>('General Nursing');
  const [formDepartment, setFormDepartment] = useState(DEPARTMENTS[0]);
  const [formGhanaCardId, setFormGhanaCardId] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formId, setFormId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return students.filter(s => {
      let matchesTerm = true;
      if (term) {
        if (searchType === 'id') {
          matchesTerm = s.id.toLowerCase().includes(term);
        } else if (searchType === 'name') {
          matchesTerm = s.name.toLowerCase().includes(term);
        } else {
          matchesTerm = s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term);
        }
      }
      const matchesLevel = levelFilter === 'All' || s.level === levelFilter;
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
      return matchesTerm && matchesLevel && matchesCategory;
    });
  }, [students, searchTerm, searchType, levelFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const displayedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert("Image is too large (2MB max)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setFormPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generatePatronId = (category: PatronCategory) => {
    const config = appSettings?.idConfig;
    if (!config) return `L-${Date.now()}`;

    const prefixMap: Record<PatronCategory, string> = {
      'Student': config.studentPrefix || 'ST',
      'Academic Staff': config.academicStaffPrefix || 'AS',
      'Non-Academic Staff': config.nonAcademicStaffPrefix || 'NAS',
      'External Visitor': config.visitorPrefix || 'EV'
    };
    const prefix = prefixMap[category];
    const categoryPatrons = students.filter(s => s.id.startsWith(prefix));
    const paddingLength = config.padding || 3;

    if (categoryPatrons.length === 0) return `${prefix}-${'1'.padStart(paddingLength, '0')}`;
    
    const maxNum = categoryPatrons.reduce((acc, curr) => {
      const parts = curr.id.split('-');
      if (parts.length < 2) return acc;
      const numPart = parseInt(parts[parts.length - 1]);
      return isNaN(numPart) ? acc : Math.max(acc, numPart);
    }, 0);
    return `${prefix}-${(maxNum + 1).toString().padStart(paddingLength, '0')}`;
  };

  useEffect(() => {
    if (!editingStudent && (isAddingStudent || formCategory)) {
      setFormId(generatePatronId(formCategory));
    }
  }, [formCategory, isAddingStudent, editingStudent, appSettings, students]);

  const resetForm = () => {
    setFormCategory('Student');
    setFormFirstName('');
    setFormSurname('');
    setFormEmail('');
    setFormPhone('');
    setFormLevel('Level 100');
    setFormProgram('General Nursing');
    setFormDepartment(DEPARTMENTS[0]);
    setFormGhanaCardId('');
    setFormPhoto('');
    setFormId('');
    setEditingStudent(null);
    setIsAddingStudent(false);
    setIsSubmitting(false);
    setFormError(null);
  };

  const handleAdd = async () => {
    if (!formFirstName || !formSurname) {
      setFormError("Identity required: Please provide First Name and Surname.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('patrons').insert([{
        id: formId,
        category: formCategory,
        first_name: formFirstName,
        surname: formSurname,
        email: formEmail,
        phone: formPhone,
        level: formCategory === 'Student' ? formLevel : null,
        program: formCategory === 'Student' ? formProgram : null,
        department: (formCategory === 'Academic Staff' || formCategory === 'Non-Academic Staff') ? formDepartment : null,
        ghana_card_id: formCategory === 'External Visitor' ? formGhanaCardId : null,
        photo: formPhoto || null
      }]);
      if (error) throw error;
      resetForm();
    } catch (error: any) {
      setFormError(error.message || "Failed to commit record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('patrons').update({
        category: formCategory,
        first_name: formFirstName,
        surname: formSurname,
        email: formEmail,
        phone: formPhone,
        level: formCategory === 'Student' ? formLevel : null,
        program: formCategory === 'Student' ? formProgram : null,
        department: (formCategory === 'Academic Staff' || formCategory === 'Non-Academic Staff') ? formDepartment : null,
        ghana_card_id: formCategory === 'External Visitor' ? formGhanaCardId : null,
        photo: formPhoto || null
      }).eq('id', editingStudent.id);
      if (error) throw error;
      resetForm();
    } catch (error: any) {
      setFormError(error.message || "Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('patrons').delete().eq('id', id);
      if (error) throw error;
      setDeletingStudent(null);
    } catch (error: any) {
      alert("Delete failed: " + error.message);
    }
  };

  const categoryColors: Record<PatronCategory, string> = {
    'Student': 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
    'Academic Staff': 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
    'Non-Academic Staff': 'text-slate-700 bg-slate-50 dark:bg-slate-800/30 dark:text-slate-400 border-slate-100 dark:border-slate-700',
    'External Visitor': 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800'
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="group">
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tighter transition-colors flex items-center">
            Patron Registry
            <div className="ml-4 h-2 w-2 rounded-full bg-amber-500 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </h2>
          <div className="flex items-center space-x-3 mt-2">
             <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'} transition-colors`}></div>
             <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center">
               Central Directory <span className="mx-2 opacity-30">•</span> {students.length} Registered Members
             </p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddingStudent(true)}
          className="group relative px-8 py-5 bg-[#0f172a] dark:bg-indigo-600 text-amber-500 dark:text-white rounded-[1.5rem] hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-2xl active:scale-95 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <i className="fas fa-user-plus mr-3 text-lg relative z-10"></i>
          <span className="text-xs font-black uppercase tracking-widest relative z-10">Register Patron</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900/40 p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
        <div className="relative flex-1 group/input">
          <input 
            type="text" 
            placeholder="SEARCH BY NAME OR ID..."
            className="w-full pl-14 pr-8 py-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 text-[#0f172a] dark:text-white text-sm font-black focus:border-amber-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 uppercase tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-focus-within/input:text-amber-500 transition-colors text-lg"></i>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-800">
          {['All', ...PATRON_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat as any)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap ${
                categoryFilter === cat 
                ? 'bg-amber-500 text-[#0f172a] shadow-xl' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {displayedStudents.map(student => (
          <div key={student.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-2xl dark:hover:shadow-black/50 hover:-translate-y-2 transition-all group animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-bl-[4rem] -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors duration-500"></div>
            
            <div className="relative z-10 flex flex-col space-y-6">
              <div className="flex items-center space-x-5">
                <div className="relative flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <div className="absolute -inset-1 bg-amber-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  {student.photo ? (
                    <img src={student.photo} alt={student.name} className="relative w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md" />
                  ) : (
                    <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center">
                      <i className="fas fa-user text-slate-300 text-2xl"></i>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-[#0f172a] dark:text-white leading-tight truncate text-lg group-hover:text-amber-600 transition-colors">{student.name}</h3>
                  <div className={`inline-block text-[8px] font-black uppercase px-2.5 py-1 rounded-lg mt-1.5 border ${categoryColors[student.category]}`}>
                    {student.category}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Patron ID</span>
                  <span className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-tighter">{student.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Affiliation</span>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                    {student.category === 'Student' ? student.program : student.department || 'External'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 mt-4 relative z-10">
              <div className="flex space-x-2">
                <button onClick={() => setQrStudent(student)} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-[#0f172a] dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl transition-all hover:shadow-lg" title="View Badge"><i className="fas fa-qrcode"></i></button>
                <button onClick={() => {
                  setEditingStudent(student);
                  setFormCategory(student.category);
                  setFormFirstName(student.firstName);
                  setFormSurname(student.surname);
                  setFormEmail(student.email);
                  setFormPhone(student.phone);
                  setFormId(student.id);
                  if (student.level) setFormLevel(student.level);
                  if (student.program) setFormProgram(student.program);
                  if (student.department) setFormDepartment(student.department);
                  if (student.ghanaCardId) setFormGhanaCardId(student.ghanaCardId);
                  setFormPhoto(student.photo || '');
                }} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-500 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all hover:shadow-lg" title="Edit Profile"><i className="fas fa-user-pen"></i></button>
              </div>
              {userRole === 'admin' && (
                <button onClick={() => setDeletingStudent(student)} className="w-11 h-11 flex items-center justify-center text-rose-300 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl transition-all hover:shadow-lg" title="Delete Record"><i className="fas fa-trash-can"></i></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isAddingStudent || !!editingStudent} 
        onClose={resetForm} 
        title={editingStudent ? "Update Member Profile" : "New Patron Enrollment"}
        maxWidth="max-w-[95%] lg:max-w-[75%]"
      >
        <div className="space-y-6 md:space-y-8">
          {formError && (
            <div className={`p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-2xl flex flex-col animate-in fade-in slide-in-from-top-2`}>
              <div className="flex items-start space-x-3">
                <i className="fas fa-circle-exclamation text-rose-600 mt-1"></i>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-relaxed">{formError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Member Category</label>
              <div className="relative group">
                <select 
                  value={formCategory} 
                  onChange={e => setFormCategory(e.target.value as PatronCategory)}
                  className="w-full px-5 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-[#0f172a] dark:text-white outline-none focus:border-amber-500 transition-all appearance-none shadow-sm cursor-pointer"
                >
                  {PATRON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <i className="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>

            <div className="p-4 md:p-5 bg-[#0f172a] dark:bg-slate-950 rounded-[1.5rem] border border-indigo-500/20 flex flex-col justify-center shadow-2xl relative overflow-hidden group min-h-[80px] md:min-h-[90px]">
              <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 -rotate-45 translate-x-6 -translate-y-6 group-hover:bg-amber-500/10 transition-colors"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 relative z-10">Allocated Library ID</p>
              <input 
                type="text"
                value={formId}
                onChange={e => setFormId(e.target.value)}
                readOnly={userRole !== 'admin'}
                className="bg-transparent text-xl lg:text-2xl font-black text-amber-500 tracking-tighter relative z-10 outline-none w-full border-none p-0 ring-0 focus:ring-0"
              />
              <i className="fas fa-address-card absolute right-4 bottom-4 text-3xl text-white/5 group-hover:text-amber-500/10 transition-colors"></i>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            <div className="lg:col-span-9 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Given Name</label>
                  <input type="text" value={formFirstName} onChange={e => setFormFirstName(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="First Name..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Family Name</label>
                  <input type="text" value={formSurname} onChange={e => setFormSurname(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="Surname..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="contact@hfnmtc.edu.gh" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                  <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="024 XXX XXXX" />
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all">
                <div className="flex items-center space-x-3 mb-4 md:mb-6">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest">Affiliation & Professional Details</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {formCategory === 'Student' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Academic Year</label>
                        <select value={formLevel} onChange={e => setFormLevel(e.target.value as AcademicLevel)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all appearance-none shadow-sm">
                          {ACADEMIC_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nursing Stream</label>
                        <select value={formProgram} onChange={e => setFormProgram(e.target.value as Program)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all appearance-none shadow-sm">
                          {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {(formCategory === 'Academic Staff' || formCategory === 'Non-Academic Staff') && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Departmental Unit</label>
                      <select value={formDepartment} onChange={e => setFormDepartment(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all appearance-none shadow-sm">
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}

                  {formCategory === 'External Visitor' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">National ID (Ghana Card)</label>
                      <input type="text" value={formGhanaCardId} onChange={e => setFormGhanaCardId(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-amber-500 transition-all shadow-sm" placeholder="GHA-XXXXXXXXX-X" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col items-center justify-center p-6 md:p-8 bg-slate-50/30 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 relative">
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="w-28 h-28 md:w-40 md:h-40 bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] border-4 border-white dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-amber-500 group transition-all relative shadow-xl"
              >
                {formPhoto ? (
                  <img src={formPhoto} className="w-full h-full object-cover" alt="Patron" />
                ) : (
                  <div className="text-center p-4">
                    <i className="fas fa-camera-retro text-slate-300 group-hover:text-amber-500 text-2xl md:text-3xl mb-2 md:mb-3 transition-colors"></i>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enroll Portrait</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <i className="fas fa-plus text-white text-2xl"></i>
                </div>
              </div>
              
              {formPhoto && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormPhoto('');
                  }}
                  className="mt-4 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                >
                  Remove Portrait
                </button>
              )}
              
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <button onClick={resetForm} className="flex-1 py-4 md:py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Discard Entry</button>
            <button 
              onClick={editingStudent ? handleUpdate : handleAdd} 
              disabled={isSubmitting}
              className="flex-[3] py-4 md:py-5 bg-[#0f172a] dark:bg-indigo-600 text-amber-500 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? <i className="fas fa-sync-alt animate-spin mr-3 text-lg"></i> : <i className="fas fa-cloud-arrow-up mr-3 text-lg"></i>}
              {editingStudent ? "Sync Updates" : "Commit to Directory"}
            </button>
          </div>
        </div>
      </Modal>

      {qrStudent && (
        <Modal isOpen={!!qrStudent} onClose={() => setQrStudent(null)} title="System Member Badge">
          <div className="flex flex-col items-center py-6">
            <div className="relative p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 border-slate-50 mb-6 md:mb-8 group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-indigo-600 to-rose-500"></div>
              <QRCodeCanvas value={qrStudent.id} size={200} level="H" includeMargin={true} />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-2xl md:text-3xl font-black text-[#0f172a] dark:text-white tracking-tighter">{qrStudent.name}</h4>
              <p className="text-[12px] md:text-[14px] font-black text-amber-600 uppercase tracking-[0.4em]">{qrStudent.id}</p>
              <div className={`mt-4 md:mt-6 inline-block px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 ${categoryColors[qrStudent.category]}`}>
                {qrStudent.category}
              </div>
            </div>
            <button onClick={() => setQrStudent(null)} className="mt-8 md:mt-12 w-full py-4 md:py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200 shadow-md">Close Badge View</button>
          </div>
        </Modal>
      )}

      {deletingStudent && (
        <Modal isOpen={!!deletingStudent} onClose={() => setDeletingStudent(null)} title="Access Revocation">
          <div className="text-center py-6 md:py-10 px-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 animate-bounce">
              <i className="fas fa-user-slash text-rose-600 text-3xl md:text-4xl"></i>
            </div>
            <h4 className="text-xl font-black text-[#0f172a] dark:text-white mb-3">Permanent Deletion?</h4>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 md:mb-10 leading-relaxed uppercase tracking-tight font-bold">You are about to purge <span className="text-rose-600 dark:text-rose-400">{deletingStudent.name}</span> from the central registry system. This action is irreversible.</p>
            <div className="flex space-x-4">
              <button onClick={() => setDeletingStudent(null)} className="flex-1 py-4 md:py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors">Abort</button>
              <button onClick={() => { handleDelete(deletingStudent.id); }} className="flex-1 py-4 md:py-5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20">Purge Record</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentManagement;
