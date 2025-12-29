
import React, { useRef, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LabelList, Legend 
} from 'recharts';
import { Session, Student, AcademicLevel, Program } from '../types';
import { ACADEMIC_LEVELS, PROGRAMS } from '../constants';
import html2canvas from 'html2canvas';

interface AnalyticsProps {
  history: Session[];
  students: Student[];
}

interface StatMetric {
  name: string;
  visits: number;
  totalMins: number;
  totalHours: number;
  timeFormatted: string;
  avgDuration: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ history, students }) => {
  const analyticsRef = useRef<HTMLDivElement>(null);
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Helper to format minutes into "Xh Ym"
  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Helper to calculate stats
  const calculateStats = useMemo(() => {
    const levelStats: StatMetric[] = ACADEMIC_LEVELS.map(level => {
      const levelStudents = students.filter(s => s.level === level);
      const levelStudentIds = levelStudents.map(s => s.id);
      const levelHistory = history.filter(h => levelStudentIds.includes(h.studentId));
      
      const visits = levelHistory.length;
      const totalMins = levelHistory.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const totalHours = parseFloat((totalMins / 60).toFixed(1));
      const avgDuration = visits > 0 ? Math.round(totalMins / visits) : 0;

      return { 
        name: level, 
        visits, 
        totalMins, 
        totalHours, 
        timeFormatted: formatTime(totalMins),
        avgDuration 
      };
    });

    const programStats: StatMetric[] = PROGRAMS.map(prog => {
      const progStudents = students.filter(s => s.program === prog);
      const progStudentIds = progStudents.map(s => s.id);
      const progHistory = history.filter(h => progStudentIds.includes(h.studentId));
      
      const visits = progHistory.length;
      const totalMins = progHistory.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const totalHours = parseFloat((totalMins / 60).toFixed(1));
      const avgDuration = visits > 0 ? Math.round(totalMins / visits) : 0;

      return { 
        name: prog, 
        visits, 
        totalMins, 
        totalHours, 
        timeFormatted: formatTime(totalMins),
        avgDuration 
      };
    });

    return { levelStats, programStats };
  }, [history, students]);

  const { levelStats, programStats } = calculateStats;

  const COLORS = ['#4338ca', '#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6'];

  const handleExportImage = async () => {
    if (!analyticsRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    
    try {
      const canvas = await html2canvas(analyticsRef.current, {
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#f8fafc',
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to generate image report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Category", "Name", "Visits", "Total Minutes", "Total Hours", "Avg Duration (mins)"];
    const levelRows = levelStats.map(s => ["Academic Level", s.name, s.visits, s.totalMins, s.totalHours, s.avgDuration]);
    const programRows = programStats.map(s => ["Program", s.name, s.visits, s.totalMins, s.totalHours, s.avgDuration]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...levelRows, [], ["---", "---", "---", "---", "---", "---"], ...programRows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `library_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    setIsExportMenuOpen(false);

    let chartsImageBase64 = '';
    try {
      if (chartsContainerRef.current) {
        const canvas = await html2canvas(chartsContainerRef.current, {
          scale: 1.5,
          backgroundColor: '#ffffff', // Force white background for Word doc compatibility
          logging: false,
          useCORS: true
        });
        chartsImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (err) {
      console.warn('Failed to capture charts for Word doc:', err);
    }

    const generateTableHtml = (title: string, stats: StatMetric[]) => `
      <h3>${title}</h3>
      <table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: sans-serif;">
        <tr style="background-color: #f1f5f9;">
          <th style="padding: 10px; text-align: left;">Name</th>
          <th style="padding: 10px; text-align: center;">Visits</th>
          <th style="padding: 10px; text-align: center;">Total Hours</th>
          <th style="padding: 10px; text-align: center;">Avg Duration</th>
        </tr>
        ${stats.map(s => `
          <tr>
            <td style="padding: 10px;">${s.name}</td>
            <td style="padding: 10px; text-align: center;">${s.visits}</td>
            <td style="padding: 10px; text-align: center;">${s.totalHours}h</td>
            <td style="padding: 10px; text-align: center;">${s.avgDuration}m</td>
          </tr>
        `).join('')}
      </table>
    `;

    const chartsHtml = chartsImageBase64 ? `
      <div style="margin-bottom: 30px; text-align: center;">
        <h3 style="text-align: left;">Visual Data Analysis</h3>
        <img src="${chartsImageBase64}" style="width: 100%; max-width: 650px; border: 1px solid #e2e8f0; border-radius: 10px;" />
      </div>
    ` : '';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Library Analytics Report</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0f172a;">Holy Family NMTC Library - Analytics Report</h2>
        <p style="color: #64748b;">Generated on: ${new Date().toLocaleString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        
        ${chartsHtml}
        
        ${generateTableHtml("Engagement by Academic Level", levelStats)}
        ${generateTableHtml("Engagement by Program", programStats)}
        
        <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; color: #94a3b8; font-size: 10px; text-align: center;">
          Official HF NMTC Library Management System Intelligence Report
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library_analytics_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
  };

  const handleExportPDF = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  const TableHeader = ({ title }: { title: string }) => (
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
      <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</h4>
    </div>
  );

  return (
    <div className="space-y-10 pb-12 p-1 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tight mb-2 transition-colors">Library Insights</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg">Analyzing student dedication through time and frequency metrics.</p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            disabled={isExporting}
            className="w-full md:w-auto bg-[#0f172a] dark:bg-indigo-600 text-amber-500 dark:text-white px-8 py-4 rounded-2xl text-xs font-black hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all flex items-center justify-center shadow-xl dark:shadow-black/20 active:scale-95 disabled:opacity-50 group"
          >
            <i className={`fas ${isExporting ? 'fa-spinner animate-spin' : 'fa-download'} mr-3 group-hover:translate-y-0.5 transition-transform`}></i>
            EXPORT REPORT
            <i className="fas fa-chevron-down ml-3 text-[10px]"></i>
          </button>

          {isExportMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={handleExportImage}
                  className="w-full text-left px-5 py-4 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center uppercase tracking-widest border-b border-slate-50 dark:border-slate-800"
                >
                  <i className="fas fa-file-image mr-4 text-indigo-500 text-lg"></i> Export as Image (PNG)
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="w-full text-left px-5 py-4 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center uppercase tracking-widest border-b border-slate-50 dark:border-slate-800"
                >
                  <i className="fas fa-file-pdf mr-4 text-rose-500 text-lg"></i> Export as Report (PDF)
                </button>
                <button 
                  onClick={handleExportWord}
                  className="w-full text-left px-5 py-4 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center uppercase tracking-widest border-b border-slate-50 dark:border-slate-800"
                >
                  <i className="fas fa-file-word mr-4 text-blue-500 text-lg"></i> Export as Document (Word)
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="w-full text-left px-5 py-4 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center uppercase tracking-widest"
                >
                  <i className="fas fa-file-csv mr-4 text-emerald-500 text-lg"></i> Export as Data (CSV)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={analyticsRef} className="space-y-10">
        <div className="hidden print:block mb-8">
           <h1 className="text-4xl font-black text-slate-900">HF NMTC Library Analytics</h1>
           <p className="text-slate-500 font-bold mt-2">Professional Facility Usage Report • {new Date().toLocaleDateString()}</p>
           <hr className="mt-6 border-slate-200" />
        </div>

        {/* Visual Charts Section */}
        <div ref={chartsContainerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl dark:hover:shadow-black/20 hover:shadow-slate-100/50 print:border-none print:shadow-none">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-widest flex items-center transition-colors">
                <i className="fas fa-chart-bar mr-3 text-indigo-600 dark:text-indigo-400 no-print"></i>
                Attendance vs. Study Time
              </h3>
              <div className="flex items-center space-x-4 no-print">
                 <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 bg-indigo-700 rounded-sm"></div>
                   <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase">Visits</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
                   <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase">Hours</span>
                 </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelStats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 800}} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 800}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    cursor={{ fill: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f8fafc' }}
                    formatter={(value, name) => [value, name === 'visits' ? 'Visits' : 'Total Hours']}
                  />
                  <Bar dataKey="visits" fill="#4338ca" radius={[6, 6, 0, 0]} barSize={35} />
                  <Bar dataKey="totalHours" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl dark:hover:shadow-black/20 hover:shadow-slate-100/50 print:border-none print:shadow-none">
            <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-8 flex items-center transition-colors">
              <i className="fas fa-clock mr-3 text-amber-500 no-print"></i>
              Study Time Distribution (by Program)
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="totalMins"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {programStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: number) => [formatTime(value), 'Total Time']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Statistics Tables Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:block print:space-y-10">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors print:border-none print:shadow-none">
            <TableHeader title="Level-Wise Engagement Details" />
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/30">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Academic Level</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Visits</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Total Study Time</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Avg Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {levelStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-8 py-5 font-black text-[#0f172a] dark:text-white text-sm">{stat.name}</td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-black text-xs print:bg-slate-100">
                          {stat.visits}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-600 dark:text-slate-300 text-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-indigo-900 dark:text-indigo-200 font-black">{stat.timeFormatted}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">({stat.totalMins} mins)</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-amber-600 dark:text-amber-500 text-sm">
                        {stat.avgDuration}<span className="text-[10px] ml-1 uppercase opacity-50">min</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors print:border-none print:shadow-none">
            <TableHeader title="Program-Wise Engagement Details" />
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/30">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Program Name</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Visits</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Total Study Time</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Avg Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {programStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-8 py-5 font-black text-[#0f172a] dark:text-white text-sm">{stat.name}</td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-black text-xs print:bg-slate-100">
                          {stat.visits}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-600 dark:text-slate-300 text-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-indigo-900 dark:text-indigo-200 font-black">{stat.timeFormatted}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">({stat.totalMins} mins)</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-amber-600 dark:text-amber-500 text-sm">
                        {stat.avgDuration}<span className="text-[10px] ml-1 uppercase opacity-50">min</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
