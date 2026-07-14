import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  HelpCircle,
  AlertTriangle,
  User,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Project {
  id: string;
  name: string;
  rep: string;
  type: 'Residential' | 'Commercial';
  priority: boolean;
  receivedAt: string;
  dateStr: string; // YYYY-MM-DD
  completedDateStr?: string; // YYYY-MM-DD
  ewp: boolean;
  trusses: boolean;
  windows: boolean;
  sentForQuote: boolean;
  status: 'INCOMING' | 'ESTIMATING' | 'QUOTING' | 'COMPLETE';
  estimateSentAt?: string;
  notes?: string;
}

interface MoultonCalendarProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  getRepColor: (repName: string) => any;
  onOpenManage: (project: Project) => void;
  onOpenUpload: () => void;
  onCalendarProjectMove?: (projName: string, type: 'received' | 'completed', dateStr: string) => void;
}

export default function MoultonCalendar({ 
  projects, 
  setProjects, 
  getRepColor, 
  onOpenManage,
  onOpenUpload,
  onCalendarProjectMove
}: MoultonCalendarProps) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(6); // July 2026 (0-indexed)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day of month index (0: Sun, 1: Mon, etc.)
  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Generate calendar cells (including leading and trailing empty cells)
  const calendarCells = useMemo(() => {
    const cells = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    // 1. Previous month padded cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      cells.push({
        day: dayNum,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      });
    }

    // 2. Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // 3. Next month padded cells to round to multiple of 7
    const remaining = 42 - cells.length; // standard 6-row layout
    for (let n = 1; n <= remaining; n++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        day: n,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex]);

  // Group projects by Date Received and Date Completed for the current view
  const dayMappedProjects = useMemo(() => {
    const receivedMap: { [date: string]: Project[] } = {};
    const completedMap: { [date: string]: Project[] } = {};

    projects.forEach(proj => {
      // Mapping for Received Plans
      if (proj.dateStr) {
        if (!receivedMap[proj.dateStr]) {
          receivedMap[proj.dateStr] = [];
        }
        receivedMap[proj.dateStr].push(proj);
      }
      
      // Mapping for Completed Plans
      if (proj.completedDateStr && proj.status === 'COMPLETE') {
        if (!completedMap[proj.completedDateStr]) {
          completedMap[proj.completedDateStr] = [];
        }
        completedMap[proj.completedDateStr].push(proj);
      }
    });

    return { receivedMap, completedMap };
  }, [projects]);

  // Handle Drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle Drag Drop
  const handleDropProject = (e: React.DragEvent, targetDateStr: string, dragTargetType: 'received' | 'completed') => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      
      const payload = JSON.parse(rawData);
      const { id, originType } = payload;
      
      if (!id) return;

      let projName = '';

      setProjects(prevProjects => {
        const found = prevProjects.find(p => p.id === id);
        if (found) {
          projName = found.name;
        }

        return prevProjects.map(proj => {
          if (proj.id !== id) return proj;

          const updated = { ...proj };
          
          if (dragTargetType === 'received') {
            // Dragged onto "Received" slot: update standard dateStr
            updated.dateStr = targetDateStr;
            
            // Re-format human timestamp as well to match
            const [y, m, d] = targetDateStr.split('-');
            const cleanMonth = parseInt(m, 10);
            const cleanDay = parseInt(d, 10);
            const timePart = proj.receivedAt.split(' ')[1] || '08:00';
            updated.receivedAt = `${cleanMonth}/${cleanDay} ${timePart}`;
          } else {
            // Dragged onto "Completed" slot: mark status as COMPLETE and set completedDateStr
            updated.status = 'COMPLETE';
            updated.completedDateStr = targetDateStr;
            
            const [y, m, d] = targetDateStr.split('-');
            const cleanMonth = parseInt(m, 10);
            const cleanDay = parseInt(d, 10);
            updated.estimateSentAt = `${cleanMonth}/${cleanDay} 16:00`;
            updated.sentForQuote = true;
          }

          return updated;
        });
      });

      if (projName && onCalendarProjectMove) {
        onCalendarProjectMove(projName, dragTargetType, targetDateStr);
      }
    } catch (err) {
      console.error('Error handling project drag drop in calendar', err);
    }
  };

  // Get active salesperson counts for current month's received / completed
  const monthStats = useMemo(() => {
    const currentYearStr = String(currentYear);
    const currentMonthStr = String(currentMonth + 1).padStart(2, '0');
    const prefix = `${currentYearStr}-${currentMonthStr}`;

    const receivedCount = projects.filter(p => p.dateStr?.startsWith(prefix)).length;
    const completedCount = projects.filter(p => p.completedDateStr?.startsWith(prefix) && p.status === 'COMPLETE').length;

    return { receivedCount, completedCount };
  }, [projects, currentYear, currentMonth]);

  // Unique list of reps in current projects for color guide legend
  const activeRepsList = useMemo(() => {
    const reps = new Set<string>();
    projects.forEach(p => {
      if (p.rep) reps.add(p.rep);
    });
    return Array.from(reps);
  }, [projects]);

  return (
    <div id="moulton-calendar-view" className="flex flex-col h-full bg-[#141518]/40 border border-[#2D2E33]/40 rounded-xl overflow-hidden p-6 gap-6">
      
      {/* Calendar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#2D2E33]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-orange-600/10 text-orange-400 border border-orange-500/20 rounded-md">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Moulton Schedule Calendar
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Drag plan cards onto dates to reschedule. Drag into completed rows to finalize estimations instantly.
          </p>
        </div>

        {/* Month Navigation & Today Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#18191C] px-4 py-2 rounded-lg border border-[#2D2E33] flex items-center justify-between w-52">
            <button 
              id="btn-cal-prev"
              onClick={handlePrevMonth} 
              className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase font-mono">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button 
              id="btn-cal-next"
              onClick={handleNextMonth} 
              className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            id="btn-cal-today"
            onClick={handleGoToToday}
            className="px-3.5 py-2 bg-[#232428] hover:bg-[#2D2E33] text-gray-300 rounded-lg text-xs font-bold transition-all border border-[#3D3E43]/60"
          >
            Today
          </button>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-[#18191C]/80 border border-[#2D2E33] rounded-lg text-xs">
            <div className="flex items-center gap-1 text-yellow-500 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>{monthStats.receivedCount} Recv</span>
            </div>
            <span className="text-gray-700">|</span>
            <div className="flex items-center gap-1 text-green-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{monthStats.completedCount} Comp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Color Legend for Salespeople */}
      <div className="bg-[#18191C]/60 border border-[#2D2E33]/30 p-3.5 rounded-lg flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 select-none">Sales Representative Colors:</span>
        {activeRepsList.map(rep => {
          const colors = getRepColor(rep);
          return (
            <span 
              key={rep}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors.badge}`}
            >
              ● {rep}
            </span>
          );
        })}
      </div>

      {/* Grid Layout - 7 Columns of Days */}
      <div className="flex-1 min-h-[500px] grid grid-cols-7 gap-1.5 bg-[#1F2024]/40 p-1.5 rounded-xl border border-[#2D2E33]/60">
        
        {/* Weekday Labels Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div 
            key={day} 
            className="p-2 text-center text-[10px] font-black uppercase text-gray-500 tracking-widest select-none bg-[#18191C]/40 rounded"
          >
            {day}
          </div>
        ))}

        {/* Days Grid */}
        {calendarCells.map((cell, idx) => {
          const isToday = now.getFullYear() === cell.year && now.getMonth() === cell.month && now.getDate() === cell.day;
          
          const dayReceivedProjects = dayMappedProjects.receivedMap[cell.dateString] || [];
          const dayCompletedProjects = dayMappedProjects.completedMap[cell.dateString] || [];

          return (
            <div
              key={idx}
              className={`min-h-[110px] flex flex-col p-2 border rounded-lg transition-all relative group ${
                cell.isCurrentMonth 
                  ? isToday
                    ? 'bg-[#1C1F28] border-orange-500/50 shadow-md shadow-orange-950/5'
                    : 'bg-[#151619] border-[#2D2E33]/40 hover:bg-[#18191D]'
                  : 'bg-[#101113]/30 border-transparent text-gray-600'
              }`}
            >
              {/* Day Number Title */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono font-bold ${
                  cell.isCurrentMonth
                    ? isToday 
                      ? 'bg-orange-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]' 
                      : 'text-gray-400'
                    : 'text-gray-700'
                }`}>
                  {cell.day}
                </span>
                
                {/* Plus upload trigger icon on hover for current month cells */}
                {cell.isCurrentMonth && (
                  <button 
                    onClick={onOpenUpload}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-orange-600/10 text-orange-500 rounded transition-opacity"
                    title="Upload plan for this date"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Day Cell Sections: Received & Completed Columns */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[140px] pr-0.5 custom-scrollbar">
                
                {/* SECTION 1: INCOMING/RECEIVED WORKSPACE */}
                <div 
                  id={`cell-recv-${cell.dateString}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropProject(e, cell.dateString, 'received')}
                  className="flex-1 min-h-[45px] bg-[#1A1B1F]/30 hover:bg-orange-600/5 rounded p-1 border border-dashed border-[#232428] hover:border-orange-500/20 transition-colors flex flex-col gap-1"
                >
                  <span className="text-[8px] uppercase tracking-wide text-orange-500/50 font-black flex items-center gap-0.5 select-none mb-0.5">
                    <Clock className="w-2 h-2" /> RECV
                  </span>

                  {dayReceivedProjects.map(proj => {
                    const colors = getRepColor(proj.rep);
                    return (
                      <div
                        key={`recv-${proj.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ id: proj.id, originType: 'received' }));
                        }}
                        onClick={() => onOpenManage(proj)}
                        className={`p-1.5 rounded text-[10px] leading-tight cursor-grab active:cursor-grabbing transition-all border flex flex-col gap-0.5 shadow-sm hover:scale-[1.02] ${colors.bg} ${colors.border} ${colors.text}`}
                        title={`Rep: ${proj.rep} - Click to manage requirements`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold truncate max-w-[90%]">{proj.name}</span>
                          {proj.priority && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow animate-pulse shrink-0" title="High Priority" />
                          )}
                        </div>
                        <span className="text-[8px] opacity-70 font-mono tracking-wider">
                          REP: {proj.rep.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SECTION 2: COMPLETED WORKSPACE */}
                <div 
                  id={`cell-comp-${cell.dateString}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropProject(e, cell.dateString, 'completed')}
                  className="flex-1 min-h-[45px] bg-[#151916]/40 hover:bg-green-600/5 rounded p-1 border border-dashed border-[#1B231D] hover:border-green-500/20 transition-colors flex flex-col gap-1"
                >
                  <span className="text-[8px] uppercase tracking-wide text-green-400/50 font-black flex items-center gap-0.5 select-none mb-0.5">
                    <CheckCircle2 className="w-2 h-2" /> COMP
                  </span>

                  {dayCompletedProjects.map(proj => {
                    const colors = getRepColor(proj.rep);
                    return (
                      <div
                        key={`comp-${proj.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ id: proj.id, originType: 'completed' }));
                        }}
                        onClick={() => onOpenManage(proj)}
                        className={`p-1.5 rounded text-[10px] leading-tight cursor-grab active:cursor-grabbing transition-all border flex flex-col gap-0.5 shadow-sm hover:scale-[1.02] bg-green-950/20 text-green-400 border-green-500/20`}
                        title={`Completed for rep: ${proj.rep} - Click to manage`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate max-w-[90%] text-gray-200 line-through decoration-gray-600">{proj.name}</span>
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-400 shrink-0" />
                        </div>
                        <span className="text-[8px] text-green-400/70 font-mono tracking-wider">
                          REP: {proj.rep.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Instructional Quick Help Card footer */}
      <div className="bg-[#18191C]/40 border border-[#2D2E33]/50 p-4 rounded-xl flex items-center gap-3.5 text-xs text-gray-400 leading-relaxed">
        <HelpCircle className="w-5 h-5 text-orange-500 shrink-0" />
        <div>
          <strong className="text-white">How Scheduling Drag & Drop Works:</strong> Click and hold any plan card in the <span className="text-orange-400 font-mono font-bold text-[10px] bg-orange-950/30 px-1 rounded">RECV</span> segment. Drag it to another day's <span className="text-orange-400 font-mono font-bold text-[10px] bg-orange-950/30 px-1 rounded">RECV</span> box to reschedule the received date. Or drag it down into a day's <span className="text-green-400 font-mono font-bold text-[10px] bg-green-950/30 px-1 rounded">COMP</span> box to mark the plan completed on that day instantly.
        </div>
      </div>
    </div>
  );
}
