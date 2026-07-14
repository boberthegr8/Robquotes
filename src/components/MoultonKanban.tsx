import React from 'react';
import { 
  Clock, 
  Layers, 
  FileText, 
  CheckCircle2, 
  User, 
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Eye,
  Settings
} from 'lucide-react';

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

interface MoultonKanbanProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  getRepColor: (repName: string) => any;
  onOpenManage: (project: Project) => void;
  presence?: { [projectId: string]: { user: string; action: 'estimating' | 'quoting' | 'viewing'; since: string } };
  onProjectStatusChange?: (projName: string, oldStatus: string, newStatus: string) => void;
}

export default function MoultonKanban({ 
  projects, 
  setProjects, 
  getRepColor, 
  onOpenManage,
  presence,
  onProjectStatusChange
}: MoultonKanbanProps) {

  const columns: { 
    id: Project['status']; 
    title: string; 
    icon: React.ReactNode; 
    borderColor: string; 
    textColor: string;
    bgSub: string;
  }[] = [
    { 
      id: 'INCOMING', 
      title: 'Incoming / Pending', 
      icon: <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />, 
      borderColor: 'border-yellow-500/30', 
      textColor: 'text-yellow-500',
      bgSub: 'bg-yellow-500/5'
    },
    { 
      id: 'ESTIMATING', 
      title: 'Estimating / Takeoff', 
      icon: <Layers className="w-4 h-4 text-orange-500" />, 
      borderColor: 'border-orange-500/30', 
      textColor: 'text-orange-400',
      bgSub: 'bg-orange-500/5'
    },
    { 
      id: 'QUOTING', 
      title: 'Quoting / Pricing', 
      icon: <FileText className="w-4 h-4 text-blue-500" />, 
      borderColor: 'border-blue-500/30', 
      textColor: 'text-blue-400',
      bgSub: 'bg-blue-500/5'
    },
    { 
      id: 'COMPLETE', 
      title: 'Dispatched / Complete', 
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, 
      borderColor: 'border-green-500/30', 
      textColor: 'text-green-400',
      bgSub: 'bg-green-500/5'
    },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Project['status']) => {
    e.preventDefault();
    try {
      const projId = e.dataTransfer.getData('text/plain');
      if (!projId) return;

      let projName = '';
      let oldStatus = '';

      setProjects(prevProjects => {
        const found = prevProjects.find(p => p.id === projId);
        if (found) {
          projName = found.name;
          oldStatus = found.status;
        }

        return prevProjects.map(proj => {
          if (proj.id !== projId) return proj;

          const updated = { ...proj, status: targetStatus };

          // Automatically set estimateSentAt and completedDateStr on transition to COMPLETE
          if (targetStatus === 'COMPLETE') {
            const now = new Date();
            if (!updated.estimateSentAt) {
              updated.estimateSentAt = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            updated.completedDateStr = `${y}-${m}-${d}`;
            updated.sentForQuote = true;
          } else {
            updated.completedDateStr = undefined;
          }

          return updated;
        });
      });

      if (projName && oldStatus && oldStatus !== targetStatus && onProjectStatusChange) {
        onProjectStatusChange(projName, oldStatus, targetStatus);
      }
    } catch (err) {
      console.error('Error dragging kanban card', err);
    }
  };

  return (
    <div id="moulton-kanban-board" className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-h-[500px]">
      {columns.map((col) => {
        const colProjects = projects.filter(p => p.status === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`bg-[#141518]/70 border border-[#2D2E33] rounded-lg p-4 flex flex-col gap-3 min-h-[450px] transition-all hover:bg-[#16171B]`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-[#2D2E33] pb-2">
              <div className="flex items-center gap-2">
                {col.icon}
                <span className={`text-xs font-black uppercase tracking-wider ${col.textColor}`}>
                  {col.title}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#18191C] px-2 py-0.5 rounded text-gray-500 border border-[#2D2E33]/60">
                {colProjects.length}
              </span>
            </div>

            {/* Column Cards List */}
            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1 custom-scrollbar">
              {colProjects.length === 0 ? (
                <div className="flex-1 border border-dashed border-[#232428] rounded-lg flex items-center justify-center p-8 text-center text-xs text-gray-650 min-h-[120px] select-none">
                  Drag plans here to change state
                </div>
              ) : (
                colProjects.map((proj) => {
                  const colors = getRepColor(proj.rep);
                  return (
                    <div
                      key={proj.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', proj.id);
                      }}
                      className={`p-4 bg-[#18191C] border-l-4 rounded-lg shadow hover:shadow-lg transition-all cursor-grab active:cursor-grabbing hover:translate-x-0.5 relative group border ${colors.borderLeft} ${colors.border}`}
                    >
                      {/* Floating actions on card */}
                      <button 
                        onClick={() => onOpenManage(proj)}
                        className="absolute right-2 top-2 p-1 bg-[#141518] hover:bg-[#232428] border border-[#2D2E33] rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quick Manage specs"
                      >
                        <Eye className="w-3 h-3 text-orange-500" />
                      </button>

                      {/* Card Heading */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-extrabold text-xs tracking-wide leading-snug truncate max-w-[85%]">
                            {proj.name}
                          </span>
                          {proj.priority && (
                            <span className="bg-red-950/40 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-900/30 uppercase animate-pulse">
                              HIGH
                            </span>
                          )}
                        </div>
                        
                        {/* Active Colleague Presence Indicator (Idea 6) */}
                        {presence && presence[proj.id] && (
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/15 w-fit">
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                            </span>
                            <span>{presence[proj.id].user} is {presence[proj.id].action}</span>
                          </div>
                        )}
                        
                        {/* Rep indicator */}
                        <div className="flex items-center gap-1.5 text-[9.5px]">
                          <span className={`px-2 py-0.5 rounded font-black tracking-wider uppercase text-[9px] ${colors.badge}`}>
                            REP: {proj.rep}
                          </span>
                          <span className="text-gray-500 uppercase text-[9px] font-semibold">{proj.type}</span>
                        </div>
                      </div>

                      {/* Requirement specification checklists inside card */}
                      <div className="mt-3.5 pt-2.5 border-t border-[#232428] grid grid-cols-3 gap-1 text-[9.5px] font-mono text-center">
                        <div className={`p-1 rounded border ${
                          proj.ewp 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 font-bold' 
                            : 'bg-[#121315]/50 text-gray-700 border-transparent'
                        }`}>
                          EWP
                        </div>
                        <div className={`p-1 rounded border ${
                          proj.trusses 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 font-bold' 
                            : 'bg-[#121315]/50 text-gray-700 border-transparent'
                        }`}>
                          TRUSS
                        </div>
                        <div className={`p-1 rounded border ${
                          proj.windows 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 font-bold' 
                            : 'bg-[#121315]/50 text-gray-700 border-transparent'
                        }`}>
                          WIN
                        </div>
                      </div>

                      {/* Footer Info inside card */}
                      <div className="mt-3 flex items-center justify-between text-[9px] text-gray-500">
                        <span className="font-mono">Recv: {proj.receivedAt.split(' ')[0]}</span>
                        {proj.status === 'COMPLETE' && proj.estimateSentAt && (
                          <span className="text-green-500 font-mono">Sent: {proj.estimateSentAt.split(' ')[0]}</span>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
