
import React, { useState, useMemo, useRef } from 'react';
import { Session, Student } from '../types';
import html2canvas from 'html2canvas';

interface HistoryProps {
  history: Session[];
  students: Student[];
}

const History: React.FC<HistoryProps> = ({ history, students }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const getStudent = (id: string) => students.find(s => s.id === id);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const student = getStudent(h.studentId);
      const matchesSearch = student?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           h.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = dateFilter ? h.checkIn.toISOString().startsWith(dateFilter) : true;
      return matchesSearch && matchesDate;
    });
  }, [history, searchTerm, dateFilter]);

  const handleExportCSV = () => {
    const headers = ["Student Name", "ID", "Date", "Check In", "Check Out", "Duration (mins)", "Notes"];
    const rows = filteredHistory.map(s => {
      const std = getStudent(s.studentId);
      return [
        std?.name || 'Unknown',
        s.studentId,
        s.checkIn.toLocaleDateString(),
        s.checkIn.toLocaleTimeString(),
        s.checkOut?.toLocaleTimeString() || 'Active',
        s.duration || '',
        s.notes || ''
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `library_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const handleExportWord = () => {
    const tableHeader = `
      <tr style="background-color: #f1f5f9; font-weight: bold; text-align: left;">
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Student Name</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">ID</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Date</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Check In</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Check Out</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Duration (mins)</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Notes</th>
      </tr>
    `;

    const tableRows = filteredHistory.map(s => {
      const std = getStudent(s.studentId);
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${std?.name || 'Unknown'}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.studentId}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.checkIn.toLocaleDateString()}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.checkIn.toLocaleTimeString()}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.checkOut?.toLocaleTimeString() || 'Active'}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.duration || ''}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.notes || ''}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Library Activity Logs</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          h2 { color: #0f172a; margin-bottom: 5px; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h2>Holy Family NMTC Library - Activity Logs</h2>
        <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
        <table border="1">${tableHeader}${tableRows}</table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library_logs_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const handleExportImage = async () => {
    if (!tableRef.current) return;
    setIsExportOpen(false);
    
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `activity_logs_snapshot_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to generate image snapshot.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-[#0f172a] dark:text-white transition-colors">Activity Logs</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm">Comprehensive record of library usage.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input 
            type="date"
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <div className="relative flex-1 sm:w-64">
            <input 
              type="text" 
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#0f172a] dark:text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center group shadow-sm"
            >
              <i className="fas fa-download mr-2 group-hover:translate-y-0.5 transition-transform text-indigo-500"></i> Export <i className="fas fa-chevron-down ml-2 text-[10px]"></i>
            </button>
            
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center border-b border-slate-50 dark:border-slate-700"
                  >
                    <i className="fas fa-file-csv mr-3 text-emerald-500"></i> Download as CSV
                  </button>
                  <button 
                    onClick={handleExportWord}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center border-b border-slate-50 dark:border-slate-700"
                  >
                    <i className="fas fa-file-word mr-3 text-blue-600"></i> Download as Word
                  </button>
                  <button 
                    onClick={handleExportImage}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                  >
                    <i className="fas fa-file-image mr-3 text-indigo-500"></i> Download as PNG
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={tableRef} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date / Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Observations</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm">
              {filteredHistory.map((session) => {
                const student = getStudent(session.studentId);
                return (
                  <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img src={student?.photo || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{student?.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter uppercase">{student?.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{session.checkIn.toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                        {session.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {session.checkOut?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Active'}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {session.duration ? `${session.duration}m` : '--'}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">{session.notes || 'No staff notes recorded.'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm ${
                        session.checkOut ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-900'
                      }`}>
                        {session.checkOut ? 'Completed' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredHistory.length === 0 && (
          <div className="py-24 text-center text-slate-300 dark:text-slate-700 transition-colors">
            <i className="fas fa-search text-4xl mb-4 opacity-20"></i>
            <p className="font-bold text-slate-400 dark:text-slate-600">No matching logs found</p>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">Adjust filters to broaden search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
