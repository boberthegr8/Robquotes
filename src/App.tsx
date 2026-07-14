import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Building2, 
  Home, 
  FileText, 
  User, 
  Check, 
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Users,
  Settings,
  CloudLightning,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Grid,
  List
} from 'lucide-react';

import MoultonCalendar from './components/MoultonCalendar';
import SlaAnalytics from './components/SlaAnalytics';
import MoultonKanban from './components/MoultonKanban';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Project {
  id: string;
  name: string;
  rep: string;
  type: 'Residential' | 'Commercial';
  priority: boolean;
  receivedAt: string;
  dateStr: string; // YYYY-MM-DD for easy mapping
  completedDateStr?: string; // YYYY-MM-DD for completion mapping
  ewp: boolean;
  trusses: boolean;
  windows: boolean;
  sentForQuote: boolean;
  status: 'INCOMING' | 'ESTIMATING' | 'QUOTING' | 'COMPLETE';
  estimateSentAt?: string;
  notes?: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  projectName: string;
  action: string;
  details: string;
  badgeColor: string;
}

const PREDEFINED_REPS = [
  'Larry',
  'Ryan',
  'Steve Running',
  'Adam',
  'Paul',
  'Josh O',
  'Josh M',
  'Steve T',
  'Rob Flagg',
  'Josh'
];

// Human-crafted, elegant representative color mappings
const getRepColor = (repName: string) => {
  const name = (repName || '').trim().toLowerCase();
  switch (name) {
    case 'larry':
      return {
        bg: 'bg-orange-500/10 hover:bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30 hover:border-orange-500/50',
        badge: 'bg-orange-600/20 text-orange-400 border border-orange-500/30',
        bgSolid: 'bg-orange-600',
        borderLeft: 'border-l-4 border-l-orange-500',
        accentColor: '#f97316'
      };
    case 'ryan':
      return {
        bg: 'bg-cyan-500/10 hover:bg-cyan-500/15',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30 hover:border-cyan-500/50',
        badge: 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30',
        bgSolid: 'bg-cyan-600',
        borderLeft: 'border-l-4 border-l-cyan-500',
        accentColor: '#06b6d4'
      };
    case 'steve running':
      return {
        bg: 'bg-lime-500/10 hover:bg-lime-500/15',
        text: 'text-lime-400',
        border: 'border-lime-500/30 hover:border-lime-500/50',
        badge: 'bg-lime-600/20 text-lime-400 border border-lime-500/30',
        bgSolid: 'bg-lime-600',
        borderLeft: 'border-l-4 border-l-lime-500',
        accentColor: '#84cc16'
      };
    case 'adam':
      return {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30 hover:border-emerald-500/50',
        badge: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
        bgSolid: 'bg-emerald-600',
        borderLeft: 'border-l-4 border-l-emerald-500',
        accentColor: '#10b981'
      };
    case 'paul':
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30 hover:border-amber-500/50',
        badge: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
        bgSolid: 'bg-amber-600',
        borderLeft: 'border-l-4 border-l-amber-500',
        accentColor: '#f59e0b'
      };
    case 'josh o':
      return {
        bg: 'bg-indigo-500/10 hover:bg-indigo-500/15',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30 hover:border-indigo-500/50',
        badge: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30',
        bgSolid: 'bg-indigo-600',
        borderLeft: 'border-l-4 border-l-indigo-500',
        accentColor: '#6366f1'
      };
    case 'josh m':
      return {
        bg: 'bg-purple-500/10 hover:bg-purple-500/15',
        text: 'text-purple-400',
        border: 'border-purple-500/30 hover:border-purple-500/50',
        badge: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
        bgSolid: 'bg-purple-600',
        borderLeft: 'border-l-4 border-l-purple-500',
        accentColor: '#a855f7'
      };
    case 'steve t':
      return {
        bg: 'bg-pink-500/10 hover:bg-pink-500/15',
        text: 'text-pink-400',
        border: 'border-pink-500/30 hover:border-pink-500/50',
        badge: 'bg-pink-600/20 text-pink-400 border border-pink-500/30',
        bgSolid: 'bg-pink-600',
        borderLeft: 'border-l-4 border-l-pink-500',
        accentColor: '#ec4899'
      };
    case 'rob flagg':
      return {
        bg: 'bg-teal-500/10 hover:bg-teal-500/15',
        text: 'text-teal-400',
        border: 'border-teal-500/30 hover:border-teal-500/50',
        badge: 'bg-teal-600/20 text-teal-400 border border-teal-500/30',
        bgSolid: 'bg-teal-600',
        borderLeft: 'border-l-4 border-l-teal-500',
        accentColor: '#14b8a6'
      };
    case 'josh':
      return {
        bg: 'bg-sky-500/10 hover:bg-sky-500/15',
        text: 'text-sky-400',
        border: 'border-sky-500/30 hover:border-sky-500/50',
        badge: 'bg-sky-600/20 text-sky-400 border border-sky-500/30',
        bgSolid: 'bg-sky-600',
        borderLeft: 'border-l-4 border-l-sky-500',
        accentColor: '#0ea5e9'
      };
    default:
      return {
        bg: 'bg-violet-500/10 hover:bg-violet-500/15',
        text: 'text-violet-400',
        border: 'border-violet-500/30 hover:border-violet-500/50',
        badge: 'bg-violet-600/20 text-violet-400 border border-violet-500/30',
        bgSolid: 'bg-[#1C1D21]',
        borderLeft: 'border-l-4 border-l-[#3D3E43]',
        accentColor: '#8b5cf6'
      };
  }
};

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Higgins Residence',
    rep: 'Larry',
    type: 'Residential',
    priority: false,
    receivedAt: '7/8 08:30',
    dateStr: '2026-07-08',
    ewp: true,
    trusses: true,
    windows: false,
    sentForQuote: false,
    status: 'ESTIMATING',
    notes: 'Needs quick truss design check.'
  },
  {
    id: 'proj-2',
    name: 'Oakwood Manor Ph II',
    rep: 'Josh O',
    type: 'Commercial',
    priority: false,
    receivedAt: '7/7 14:15',
    dateStr: '2026-07-07',
    ewp: true,
    trusses: true,
    windows: true,
    status: 'QUOTING',
    sentForQuote: false,
    notes: 'Quote pending window count updates.'
  },
  {
    id: 'proj-3',
    name: 'Westside Retail',
    rep: 'Steve Running',
    type: 'Commercial',
    priority: true,
    receivedAt: '7/6 09:00',
    dateStr: '2026-07-06',
    completedDateStr: '2026-07-08',
    ewp: true,
    trusses: false,
    windows: true,
    status: 'COMPLETE',
    sentForQuote: true,
    estimateSentAt: '7/8 10:15',
    notes: 'Sent PDF to rep.'
  },
  {
    id: 'proj-4',
    name: 'Canyon Lake Estates',
    rep: 'Ryan',
    type: 'Residential',
    priority: true,
    receivedAt: '7/8 11:45',
    dateStr: '2026-07-08',
    ewp: false,
    trusses: true,
    windows: true,
    status: 'INCOMING',
    sentForQuote: false
  },
  {
    id: 'proj-5',
    name: 'Downtown Mixed-Use',
    rep: 'Steve T',
    type: 'Commercial',
    priority: false,
    receivedAt: '7/5 15:30',
    dateStr: '2026-07-05',
    ewp: true,
    trusses: false,
    windows: false,
    status: 'ESTIMATING',
    sentForQuote: false
  },
  {
    id: 'proj-6',
    name: 'Moulton Lumber Main Spec',
    rep: 'Adam',
    type: 'Commercial',
    priority: true,
    receivedAt: '7/4 10:00',
    dateStr: '2026-07-04',
    completedDateStr: '2026-07-06',
    ewp: true,
    trusses: true,
    windows: false,
    status: 'COMPLETE',
    sentForQuote: true,
    estimateSentAt: '7/6 14:00',
    notes: 'Licensed specimen truss takeoff for Adam Moulton.'
  },
  {
    id: 'proj-7',
    name: 'Flagg Framing Cabin',
    rep: 'Rob Flagg',
    type: 'Residential',
    priority: false,
    receivedAt: '7/7 08:00',
    dateStr: '2026-07-07',
    completedDateStr: '2026-07-07',
    ewp: false,
    trusses: true,
    windows: true,
    status: 'COMPLETE',
    sentForQuote: true,
    estimateSentAt: '7/7 16:30',
    notes: 'Completed prompt framing takeoff.'
  },
  {
    id: 'proj-8',
    name: 'Steve\'s Valley Duplex',
    rep: 'Steve Running',
    type: 'Residential',
    priority: false,
    receivedAt: '7/6 11:30',
    dateStr: '2026-07-06',
    completedDateStr: '2026-07-07',
    ewp: true,
    trusses: true,
    windows: false,
    status: 'COMPLETE',
    sentForQuote: true,
    estimateSentAt: '7/7 11:00',
    notes: 'Both EWP and Truss systems completed.'
  },
  {
    id: 'proj-9',
    name: 'High Street Townhomes',
    rep: 'Paul',
    type: 'Commercial',
    priority: true,
    receivedAt: '7/7 09:00',
    dateStr: '2026-07-07',
    completedDateStr: '2026-07-08',
    ewp: true,
    trusses: true,
    windows: true,
    status: 'COMPLETE',
    sentForQuote: true,
    estimateSentAt: '7/8 09:15',
    notes: 'Quoting dispatched to team.'
  },
  {
    id: 'proj-10',
    name: 'Commercial Storage Shed',
    rep: 'Josh M',
    type: 'Commercial',
    priority: false,
    receivedAt: '7/8 12:10',
    dateStr: '2026-07-08',
    ewp: false,
    trusses: true,
    windows: false,
    status: 'INCOMING',
    sentForQuote: false
  }
];

export default function App() {
  const [projects, _setProjects] = useState<Project[]>([]);
  const [activityLogs, _setActivityLogs] = useState<ActivityLog[]>([]);

  // Intercept component state updates to automatically save to Firestore
  const setProjects = React.useCallback((val: React.SetStateAction<Project[]>) => {
    _setProjects(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      
      // Determine what changed and write to Firestore
      next.forEach(async (p) => {
        const prevP = prev.find(old => old.id === p.id);
        if (!prevP || JSON.stringify(prevP) !== JSON.stringify(p)) {
          try {
            await setDoc(doc(db, 'projects', p.id), p);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `projects/${p.id}`);
          }
        }
      });
      
      // Handle deletions
      prev.forEach(async (p) => {
        if (!next.some(n => n.id === p.id)) {
          try {
            await deleteDoc(doc(db, 'projects', p.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `projects/${p.id}`);
          }
        }
      });
      
      return next;
    });
  }, []);

  // Sync state with Firestore real-time snapshots
  useEffect(() => {
    const qProjects = collection(db, 'projects');
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_PROJECTS.forEach(async (p) => {
          try {
            await setDoc(doc(db, 'projects', p.id), p);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `projects/${p.id}`);
          }
        });
      } else {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Project;
          const repName = (data.rep || '').toLowerCase();
          const isUnwanted = repName.includes('mike') || repName.includes('miller') || repName.includes('sara') || repName.includes('gennings');
          
          if (isUnwanted) {
            // Self-healing: Delete unwanted record from Firestore dynamically
            deleteDoc(doc(db, 'projects', docSnap.id)).catch(err => {
              console.error("Purged unwanted rep project failed", err);
            });
          } else {
            projs.push(data);
          }
        });
        _setProjects(projs);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'projects');
    });

    const qLogs = collection(db, 'activityLogs');
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      if (snapshot.empty) {
        const defaultLogs = [
          {
            id: 'log-1',
            timestamp: '7/8 12:40',
            user: 'Josh M',
            projectName: 'Commercial Storage Shed',
            action: 'checklist_update',
            details: 'Checked EWP=NO, Trusses=YES, Windows=NO specifications.',
            badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-600/5'
          },
          {
            id: 'log-2',
            timestamp: '7/8 11:45',
            user: 'Ryan',
            projectName: 'Canyon Lake Estates',
            action: 'upload',
            details: 'Uploaded new plans and initiated takeoff check.',
            badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-600/5'
          },
          {
            id: 'log-3',
            timestamp: '7/8 10:15',
            user: 'Steve Running',
            projectName: 'Westside Retail',
            action: 'status_change',
            details: 'Moved board status to COMPLETE. Sent for quoting dispatch.',
            badgeColor: 'border-lime-500/30 text-lime-400 bg-lime-600/5'
          },
          {
            id: 'log-4',
            timestamp: '7/7 16:30',
            user: 'Rob Flagg',
            projectName: 'Flagg Framing Cabin',
            action: 'status_change',
            details: 'Moved status to COMPLETE. Framing takeoff successfully dispatched.',
            badgeColor: 'border-teal-500/30 text-teal-400 bg-teal-600/5'
          },
          {
            id: 'log-5',
            timestamp: '7/7 14:15',
            user: 'Josh O',
            projectName: 'Oakwood Manor Ph II',
            action: 'upload',
            details: 'Uploaded new Commercial specifications for Ph II block.',
            badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-600/5'
          },
          {
            id: 'log-6',
            timestamp: '7/7 11:00',
            user: 'Steve Running',
            projectName: "Steve's Valley Duplex",
            action: 'status_change',
            details: 'Moved status to COMPLETE.',
            badgeColor: 'border-lime-500/30 text-lime-400 bg-lime-600/5'
          }
        ];
        defaultLogs.forEach(async (log) => {
          try {
            await setDoc(doc(db, 'activityLogs', log.id), log);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `activityLogs/${log.id}`);
          }
        });
      } else {
        const logs: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActivityLog;
          const userName = (data.user || '').toLowerCase();
          const detailsText = (data.details || '').toLowerCase();
          const projName = (data.projectName || '').toLowerCase();
          const isUnwanted = userName.includes('mike') || userName.includes('miller') || userName.includes('sara') || userName.includes('gennings') ||
                             detailsText.includes('mike') || detailsText.includes('miller') || detailsText.includes('sara') || detailsText.includes('gennings');
          
          if (isUnwanted) {
            // Self-healing: Delete unwanted log from Firestore
            deleteDoc(doc(db, 'activityLogs', docSnap.id)).catch(err => {
              console.error("Purged unwanted activity log failed", err);
            });
          } else {
            logs.push(data);
          }
        });
        logs.sort((a, b) => {
          const parseTime = (str: string) => {
            const [datePart, timePart] = str.split(' ');
            if (!datePart || !timePart) return 0;
            const [m, d] = datePart.split('/').map(Number);
            const [h, min] = timePart.split(':').map(Number);
            return new Date(2026, m - 1, d, h, min).getTime();
          };
          return parseTime(b.timestamp) - parseTime(a.timestamp);
        });
        _setActivityLogs(logs);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'activityLogs');
    });

    return () => {
      unsubscribeProjects();
      unsubscribeLogs();
    };
  }, []);

  // Current logged in rep selection for active identity and collaboration logs
  const [currentRep, setCurrentRep] = useState<string>('Rob Flagg');
  
  // Navigation: 'calendar' (Full-screen schedule), 'board' (Shared Delivery Board), 'logs' (Global Team Feed), 'archive' (Archive / History), 'analytics' (Group SLA analytics)
  const [activeTab, setActiveTab] = useState<'calendar' | 'board' | 'logs' | 'archive' | 'analytics'>('calendar');

  // Real-time synchronization states (Ideas 1, 6, 9)
  const [liveSyncSimulate, setLiveSyncSimulate] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);
  
  // Real-time Editor presence session mapping (Idea 6)
  const [presence, setPresence] = useState<{ [projectId: string]: { user: string; action: 'estimating' | 'quoting' | 'viewing'; since: string } }>({
    'proj-1': { user: 'Larry', action: 'estimating', since: '12:35' },
    'proj-2': { user: 'Josh O', action: 'quoting', since: '12:42' },
    'proj-4': { user: 'Ryan', action: 'estimating', since: '12:40' }
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const logActivity = (user: string, projectName: string, action: string, details: string) => {
    const now = new Date();
    const timestampStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const colors = getRepColor(user);
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: timestampStr,
      user,
      projectName,
      action,
      details,
      badgeColor: `${colors.border} ${colors.text} ${colors.bg}`
    };
    setDoc(doc(db, 'activityLogs', newLog.id), newLog).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `activityLogs/${newLog.id}`);
    });
  };

  // Toggle between 'table' or interactive 'kanban' board views
  const [boardView, setBoardView] = useState<'table' | 'kanban'>('kanban');

  // Quick Filters
  const [filterResidential, setFilterResidential] = useState<boolean>(true);
  const [filterCommercial, setFilterCommercial] = useState<boolean>(true);
  const [filterHighPriorityOnly, setFilterHighPriorityOnly] = useState<boolean>(false);

  // Status-specific filter selected by clicking on KPI cards (null means no filter)
  const [statusFilter, setStatusFilter] = useState<'INCOMING' | 'ESTIMATING' | 'QUOTING' | 'COMPLETE' | null>(null);

  // Date Filter selected from Left Sidebar calendar widget
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Left Sidebar Calendar Navigation state
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(6); // July (0-indexed)
  const [isCalendarExpanded, setIsCalendarExpanded] = useState<boolean>(true);

  // Search input
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isSharingInfoModalOpen, setIsSharingInfoModalOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form states for adding new projects
  const [newProjName, setNewProjName] = useState('');
  
  // Custom or click-to-select rep management
  const [newProjRep, setNewProjRep] = useState('Larry');
  const [isCustomRepActive, setIsCustomRepActive] = useState(false);
  const [customRepName, setCustomRepName] = useState('');

  const [newProjType, setNewProjType] = useState<'Residential' | 'Commercial'>('Residential');
  const [newProjPriority, setNewProjPriority] = useState(false);
  const [newProjEwp, setNewProjEwp] = useState(true);
  const [newProjTrusses, setNewProjTrusses] = useState(true);
  const [newProjWindows, setNewProjWindows] = useState(false);
  const [newProjSentQuote, setNewProjSentQuote] = useState(false);
  const [newProjStatus, setNewProjStatus] = useState<'INCOMING' | 'ESTIMATING' | 'QUOTING' | 'COMPLETE'>('INCOMING');
  const [newProjNotes, setNewProjNotes] = useState('');



  // Simulated live collaborative multi-user updates (Idea 1 & Idea 6)
  useEffect(() => {
    if (!liveSyncSimulate) return;

    const interval = setInterval(() => {
      // Pick a random representative from predefined other reps
      const otherReps = PREDEFINED_REPS.filter(r => r !== currentRep);
      const randomRep = otherReps[Math.floor(Math.random() * otherReps.length)];
      
      const actionType = Math.random() > 0.45 ? 'checklist_update' : 'status_change';
      const now = new Date();
      const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = formatDateStr(now);

      if (actionType === 'status_change') {
        const activeProjects = projects.filter(p => p.status !== 'COMPLETE');
        if (activeProjects.length > 0) {
          const randomProj = activeProjects[Math.floor(Math.random() * activeProjects.length)];
          const nextStatusMap: { [key: string]: 'ESTIMATING' | 'QUOTING' | 'COMPLETE' } = {
            'INCOMING': 'ESTIMATING',
            'ESTIMATING': 'QUOTING',
            'QUOTING': 'COMPLETE'
          };
          const nextStatus = nextStatusMap[randomProj.status] || 'COMPLETE';

          setProjects(prev => prev.map(p => {
            if (p.id !== randomProj.id) return p;
            const updated = { ...p, status: nextStatus };
            if (nextStatus === 'COMPLETE') {
              updated.completedDateStr = dateStr;
              updated.estimateSentAt = timeStr;
              updated.sentForQuote = true;
            }
            return updated;
          }));

          logActivity(randomRep, randomProj.name, 'status_change', `Updated status from ${randomProj.status} to ${nextStatus}`);
          showToast(`🔄 Status Sync: ${randomRep} moved "${randomProj.name}" to ${nextStatus}`);
        }
      } else {
        const activeProjects = projects.filter(p => p.status !== 'COMPLETE');
        if (activeProjects.length > 0) {
          const randomProj = activeProjects[Math.floor(Math.random() * activeProjects.length)];
          const targetField = (['ewp', 'trusses', 'windows'] as const)[Math.floor(Math.random() * 3)];
          const nextVal = !randomProj[targetField];

          setProjects(prev => prev.map(p => {
            if (p.id !== randomProj.id) return p;
            return { ...p, [targetField]: nextVal };
          }));

          logActivity(randomRep, randomProj.name, 'checklist_update', `Toggled ${targetField.toUpperCase()} requirement to ${nextVal ? 'YES' : 'NO'}`);
          showToast(`📝 Checklist Sync: ${randomRep} changed ${targetField.toUpperCase()} to ${nextVal ? 'YES' : 'NO'} for "${randomProj.name}"`);
        }
      }

      // Randomly rotate card editing presence (Idea 6)
      setPresence(prev => {
        const updated = { ...prev };
        const activeProjs = projects.filter(p => p.status !== 'COMPLETE');
        if (activeProjs.length > 0) {
          const randP = activeProjs[Math.floor(Math.random() * activeProjs.length)];
          // Clean other editing presence sessions of this rep
          Object.keys(updated).forEach(k => {
            if (updated[k]?.user === randomRep) {
              delete updated[k];
            }
          });
          updated[randP.id] = {
            user: randomRep,
            action: (['estimating', 'quoting', 'viewing'] as const)[Math.floor(Math.random() * 3)],
            since: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
          };
        }
        return updated;
      });

    }, 35000); // Trigger a sync action every 35 seconds

    return () => clearInterval(interval);
  }, [liveSyncSimulate, projects, currentRep]);

  // Handle opening the manage/edit requirements popup
  const handleOpenManage = (project: Project) => {
    setSelectedProject({ ...project });
    setIsManageModalOpen(true);
  };

  // Handle updating the selected project's state in the manage popup
  const handleUpdateRequirement = (field: keyof Project, value: any) => {
    if (!selectedProject) return;
    
    const updated = { ...selectedProject, [field]: value };
    
    // Automatically set estimateSentAt and completedDateStr if changing to complete or changing sentForQuote
    if (field === 'status' && value === 'COMPLETE') {
      const now = new Date();
      if (!updated.estimateSentAt) {
        updated.estimateSentAt = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
      updated.completedDateStr = formatDateStr(now);
      updated.sentForQuote = true;
    } else if (field === 'status' && value !== 'COMPLETE') {
      updated.completedDateStr = undefined;
    } else if (field === 'sentForQuote' && value === true && !updated.estimateSentAt) {
      const now = new Date();
      updated.estimateSentAt = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (field === 'sentForQuote' && value === false) {
      updated.estimateSentAt = undefined;
    }
    
    setSelectedProject(updated);
  };

  // Submit manage popup edits
  const handleSaveProjectEdits = () => {
    if (!selectedProject) return;
    
    // Find original project to identify specific edits
    const original = projects.find(p => p.id === selectedProject.id);
    if (original) {
      const changes: string[] = [];
      if (original.status !== selectedProject.status) changes.push(`Status changed to ${selectedProject.status}`);
      if (original.ewp !== selectedProject.ewp) changes.push(`EWP toggled to ${selectedProject.ewp ? 'YES' : 'NO'}`);
      if (original.trusses !== selectedProject.trusses) changes.push(`Trusses toggled to ${selectedProject.trusses ? 'YES' : 'NO'}`);
      if (original.windows !== selectedProject.windows) changes.push(`Windows toggled to ${selectedProject.windows ? 'YES' : 'NO'}`);
      if (original.sentForQuote !== selectedProject.sentForQuote) changes.push(`Sent for quote toggled to ${selectedProject.sentForQuote ? 'YES' : 'NO'}`);
      if (original.rep !== selectedProject.rep) changes.push(`Reassigned representative to ${selectedProject.rep}`);
      if (original.priority !== selectedProject.priority) changes.push(`Priority changed to ${selectedProject.priority ? 'HIGH' : 'NORMAL'}`);
      if (original.notes !== selectedProject.notes) changes.push(`Notes/Specifications updated`);

      const detailsStr = changes.length > 0 ? changes.join(', ') : 'Updated specs';
      logActivity(currentRep, selectedProject.name, 'spec_edit', detailsStr);
    }

    setProjects(prev => prev.map(p => p.id === selectedProject.id ? selectedProject : p));
    setIsManageModalOpen(false);
    setSelectedProject(null);
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to remove this project estimate?')) {
      const projToDelete = projects.find(p => p.id === id);
      if (projToDelete) {
        logActivity(currentRep, projToDelete.name, 'delete', `Removed plan estimate from the delivery board.`);
      }
      setProjects(prev => prev.filter(p => p.id !== id));
      setIsManageModalOpen(false);
      setSelectedProject(null);
    }
  };

  // Helper to format date strings
  const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Reset form and submit a new project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    // Determine representative name based on button vs custom input
    const finalRepName = isCustomRepActive ? customRepName.trim() : newProjRep;
    if (!finalRepName) {
      alert('Please select or specify a salesperson name!');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = formatDateStr(now);

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      rep: finalRepName,
      type: newProjType,
      priority: newProjPriority,
      receivedAt: formattedDate,
      dateStr: dateStr, // Tracked precisely for the left sidebar calendar
      completedDateStr: newProjStatus === 'COMPLETE' ? dateStr : undefined,
      ewp: newProjEwp,
      trusses: newProjTrusses,
      windows: newProjWindows,
      sentForQuote: newProjSentQuote,
      status: newProjStatus,
      estimateSentAt: newProjSentQuote || newProjStatus === 'COMPLETE' ? formattedDate : undefined,
      notes: newProjNotes.trim()
    };

    setProjects(prev => [newProj, ...prev]);
    logActivity(finalRepName, newProjName.trim(), 'upload', `Uploaded new ${newProjType} plan specifications: EWP=${newProjEwp ? 'YES' : 'NO'}, Trusses=${newProjTrusses ? 'YES' : 'NO'}, Windows=${newProjWindows ? 'YES' : 'NO'}${newProjSentQuote ? ' (Sent directly for quote review)' : ''}`);
    setIsAddModalOpen(false);
    
    // Reset fields
    setNewProjName('');
    setNewProjRep('Larry');
    setIsCustomRepActive(false);
    setCustomRepName('');
    setNewProjType('Residential');
    setNewProjPriority(false);
    setNewProjEwp(true);
    setNewProjTrusses(true);
    setNewProjWindows(false);
    setNewProjSentQuote(false);
    setNewProjStatus('INCOMING');
    setNewProjNotes('');
  };

  // Calculate dynamic stats
  const totalInQueue = useMemo(() => {
    return projects.filter(p => p.status !== 'COMPLETE').length;
  }, [projects]);

  const completedTodayCount = useMemo(() => {
    return projects.filter(p => p.status === 'COMPLETE').length;
  }, [projects]);

  const statIncoming = useMemo(() => projects.filter(p => p.status === 'INCOMING').length, [projects]);
  const statEstimating = useMemo(() => projects.filter(p => p.status === 'ESTIMATING').length, [projects]);
  const statQuoting = useMemo(() => projects.filter(p => p.status === 'QUOTING').length, [projects]);
  const statCompleted = useMemo(() => projects.filter(p => p.status === 'COMPLETE').length, [projects]);

  // List of unique reps to switch user or assignees
  const allReps = useMemo(() => {
    const repsSet = new Set(PREDEFINED_REPS);
    projects.forEach(p => {
      if (p.rep && p.rep.trim()) {
        repsSet.add(p.rep.trim());
      }
    });
    return Array.from(repsSet);
  }, [projects]);

  // Filter projects list dynamically
  const filteredProjects = useMemo(() => {
    return projects.filter(proj => {
      // 1. Tab-based main filter
      if (activeTab === 'archive' && proj.status !== 'COMPLETE') {
        return false;
      }

      // 2. Type quick filters
      if (!filterResidential && proj.type === 'Residential') {
        return false;
      }
      if (!filterCommercial && proj.type === 'Commercial') {
        return false;
      }

      // 3. High priority quick filter
      if (filterHighPriorityOnly && !proj.priority) {
        return false;
      }

      // 4. KPI Card status filter
      if (statusFilter && proj.status !== statusFilter) {
        return false;
      }

      // 5. Date Filter from sidebar calendar
      if (selectedDateFilter && proj.dateStr !== selectedDateFilter) {
        return false;
      }

      // 6. Text Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = proj.name.toLowerCase().includes(query);
        const matchesRep = proj.rep.toLowerCase().includes(query);
        const matchesStatus = proj.status.toLowerCase().includes(query);
        const matchesNotes = proj.notes?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesRep && !matchesStatus && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [projects, activeTab, currentRep, filterResidential, filterCommercial, filterHighPriorityOnly, statusFilter, selectedDateFilter, searchQuery]);

  // Left Sidebar Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Generate date list for rendering
  const daysInMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  const calendarDaysArray = useMemo(() => {
    const days = [];
    // Prefix spaces for start alignment of weekdays
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [daysInMonth, firstDayIndex]);

  // Check which days have projects for rendering markers
  const projectDatesMap = useMemo(() => {
    const map: { [dateStr: string]: boolean } = {};
    projects.forEach(p => {
      if (p.dateStr) {
        map[p.dateStr] = true;
      }
    });
    return map;
  }, [projects]);

  // Global Activity Logs Tab Component (Idea 9)
  const GlobalActivityLogs = () => {
    return (
      <div id="global-activity-logs-container" className="flex flex-col h-full bg-[#141518]/40 border border-[#2D2E33]/40 rounded-xl p-6 gap-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D2E33] pb-4">
          <div>
            <h2 id="logs-header-title" className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <CloudLightning className="w-5 h-5 text-orange-500 animate-pulse" />
              <span>Global Live Activity Feed</span>
            </h2>
            <p id="logs-header-desc" className="text-xs text-gray-500 mt-0.5">
              Transparent real-time audit log of all estimate submissions, specification changes, and status shifts.
            </p>
          </div>
          
          <div id="logs-sync-status" className="flex items-center gap-3 bg-[#18191C] px-3 py-1.5 rounded-lg border border-[#2D2E33] text-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Real-time Sync Active</span>
          </div>
        </div>

        {/* Live Simulator Controls Banner */}
        <div id="sim-controls-banner" className="bg-[#1C1F28] border border-orange-500/20 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-3 items-start">
            <CloudLightning className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Multi-User Simulation Engine</h4>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xl">
                This engine simulates real-time concurrent activity from other Moulton Lumber estimators (Larry, Ryan, Josh M, etc.) to showcase how the multi-user shared site handles presence indicators and edits.
              </p>
            </div>
          </div>
          <button
            id="btn-toggle-sim"
            onClick={() => setLiveSyncSimulate(!liveSyncSimulate)}
            className={`px-4 py-2 rounded text-xs font-black uppercase tracking-wider transition-all border ${
              liveSyncSimulate 
                ? 'bg-green-600 hover:bg-green-500 text-white border-green-500/35 cursor-pointer' 
                : 'bg-[#232428] hover:bg-[#2D2E33] text-gray-400 border-[#3D3E43]/60 cursor-pointer'
            }`}
          >
            {liveSyncSimulate ? '● Simulation Running' : '○ Simulation Paused'}
          </button>
        </div>

        {/* Log Entries List */}
        <div id="logs-entries-list" className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-3 custom-scrollbar min-h-[300px]">
          {activityLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-700 mb-2" />
              <p className="text-sm font-semibold">No activity logged yet.</p>
            </div>
          ) : (
            activityLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3.5 bg-[#18191C]/80 border border-[#2D2E33] hover:border-gray-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Action Type Icon */}
                  <div className={`p-2 rounded shrink-0 border ${
                    log.action === 'upload' ? 'bg-cyan-600/10 text-cyan-400 border-cyan-500/20' :
                    log.action === 'status_change' ? 'bg-green-600/10 text-green-400 border-green-500/20' :
                    log.action === 'delete' ? 'bg-red-600/10 text-red-400 border-red-500/20' :
                    'bg-orange-600/10 text-orange-400 border-orange-500/20'
                  }`}>
                    {log.action === 'upload' && <Plus className="w-4 h-4" />}
                    {log.action === 'status_change' && <CheckCircle2 className="w-4 h-4" />}
                    {log.action === 'delete' && <Trash2 className="w-4 h-4" />}
                    {log.action !== 'upload' && log.action !== 'status_change' && log.action !== 'delete' && <Settings className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${log.badgeColor}`}>
                        {log.user}
                      </span>
                      <span className="text-gray-400 text-xs font-semibold">
                        on <span className="text-white font-black">{log.projectName}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 font-medium leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] font-mono font-bold text-gray-500 select-none">
                  {log.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="app-container" className="flex flex-col min-h-screen bg-[#0F1012] text-gray-300 font-sans overflow-x-hidden selection:bg-orange-600 selection:text-white">
      
      {/* Top Main Header */}
      <header id="main-header" className="h-16 flex items-center justify-between px-6 bg-[#18191C] border-b border-[#2D2E33] shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div id="header-logo-icon" className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center font-extrabold text-white tracking-wider text-lg shadow-inner">M</div>
          <div className="flex flex-col">
            <h1 id="header-logo-text" className="text-base sm:text-lg font-black tracking-tight text-white leading-tight select-none">
              FORGE <span className="text-orange-500 font-light italic">ESTIMATING</span>
            </h1>
            <span className="text-[9px] text-orange-500/80 font-bold tracking-widest uppercase select-none leading-none mt-0.5">
              Moulton Lumber Group
            </span>
          </div>
        </div>
        
        {/* Statistics, Sharing Info & Actions */}
        <div className="flex items-center gap-6">
          <div id="header-stats" className="hidden lg:flex gap-6 text-xs font-semibold uppercase tracking-widest text-gray-500">
            <div className="flex flex-col border-r border-[#2D2E33] pr-6">
              <span className="text-orange-500 text-sm font-mono font-bold">{String(totalInQueue).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-400">In Queue</span>
            </div>
            <div className="flex flex-col">
              <span className="text-green-500 text-sm font-mono font-bold">{String(completedTodayCount).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-400">Completed Total</span>
            </div>
          </div>

          {/* Sharing Info Toggle */}
          <button
            id="btn-trigger-sharing-info"
            onClick={() => setIsSharingInfoModalOpen(true)}
            className="px-3 py-1.5 bg-[#232428]/40 hover:bg-[#2D2E33]/60 border border-[#3D3E43]/60 rounded-lg text-xs text-orange-400 font-bold transition-all flex items-center gap-1.5"
            title="Learn about Multi-user Sharing options"
          >
            <CloudLightning className="w-3.5 h-3.5 animate-pulse text-orange-500" />
            <span className="hidden sm:inline">How to Share?</span>
          </button>

          {/* Current User Representative Switcher */}
          <div id="rep-selector-container" className="flex items-center gap-2 bg-[#141518] px-3 py-1.5 rounded-lg border border-[#2D2E33] text-xs">
            <User className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-gray-400 hidden md:inline">Viewing As:</span>
            <select 
              id="active-rep-dropdown"
              value={currentRep} 
              onChange={(e) => {
                setCurrentRep(e.target.value);
              }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {allReps.map(repName => (
                <option key={repName} value={repName} className="bg-[#18191C] text-gray-300">{repName}</option>
              ))}
            </select>
          </div>

          <button 
            id="btn-trigger-upload"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white rounded text-xs sm:text-sm font-bold shadow-lg shadow-orange-950/20 transition-all duration-150 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>NEW PLAN UPLOAD</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div id="main-workspace-layout" className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Aside Navigation, Calendar & Filters */}
        <aside id="sidebar-panel" className="w-full md:w-64 bg-[#141518] border-b md:border-b-0 md:border-r border-[#2D2E33] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
          
          {/* Main Navigation */}
          <nav id="sidebar-nav" className="space-y-1">
            <p id="nav-section-title" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none">Navigation</p>
            
            <button 
              id="nav-link-calendar"
              onClick={() => { setActiveTab('calendar'); setStatusFilter(null); setSelectedDateFilter(null); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === 'calendar' 
                  ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4 text-orange-500" />
                <span>Moulton Schedule Calendar</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1D21] text-orange-400 font-bold">New</span>
            </button>

            <button 
              id="nav-link-board"
              onClick={() => { setActiveTab('board'); setStatusFilter(null); setSelectedDateFilter(null); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === 'board' 
                  ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Shared Delivery Board</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1D21] text-gray-400">{projects.length}</span>
            </button>

            <button 
              id="nav-link-logs"
              onClick={() => { setActiveTab('logs'); setStatusFilter(null); setSelectedDateFilter(null); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === 'logs' 
                  ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CloudLightning className="w-4 h-4 text-orange-500" />
                <span>Live Team Activity Feed</span>
              </div>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
            </button>

            <button 
              id="nav-link-archive"
              onClick={() => { setActiveTab('archive'); setStatusFilter(null); setSelectedDateFilter(null); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === 'archive' 
                  ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Archive / History</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1D21] text-gray-400">
                {projects.filter(p => p.status === 'COMPLETE').length}
              </span>
            </button>

            {/* Group SLA insights button commented out for now - keep background reporting */}
            {/*
            <button 
              id="nav-link-analytics"
              onClick={() => { setActiveTab('analytics'); setStatusFilter(null); setSelectedDateFilter(null); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === 'analytics' 
                  ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-4 h-4 text-orange-500" />
                <span>Group SLA Insights</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1D21] text-gray-400">Stats</span>
            </button>
            */}
          </nav>

          {/* Left Sidebar Interactive Plan Calendar Widget */}
          <div id="sidebar-calendar-widget" className="border-t border-[#2D2E33]/60 pt-4">
            <button 
              id="btn-toggle-calendar"
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none"
            >
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-orange-500" />
                <span>Plan Calendar</span>
              </span>
              {isCalendarExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
            </button>

            {isCalendarExpanded && (
              <div className="bg-[#18191C]/80 border border-[#2D2E33]/70 rounded-lg p-2.5 mt-2 animate-in slide-in-from-top-1 duration-150">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {monthNames[calendarMonth]} <span className="text-gray-500 font-mono text-[10px]">{calendarYear}</span>
                  </span>
                  <div className="flex gap-1.5">
                    <button 
                      id="btn-calendar-prev"
                      onClick={handlePrevMonth}
                      className="p-1 hover:bg-[#2D2E33] rounded text-gray-400 hover:text-white transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      id="btn-calendar-next"
                      onClick={handleNextMonth}
                      className="p-1 hover:bg-[#2D2E33] rounded text-gray-400 hover:text-white transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-gray-500 text-center uppercase tracking-wider mb-1.5 border-b border-[#232428] pb-1">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarDaysArray.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return <div key={`empty-${idx}`} />;
                    }

                    // Format full date key for checks
                    const monthKey = String(calendarMonth + 1).padStart(2, '0');
                    const dayKey = String(dayNum).padStart(2, '0');
                    const dayDateStr = `${calendarYear}-${monthKey}-${dayKey}`;

                    const hasPlans = projectDatesMap[dayDateStr];
                    const isSelected = selectedDateFilter === dayDateStr;

                    // Highlight today as well
                    const todayDate = new Date();
                    const isToday = todayDate.getDate() === dayNum && 
                                    todayDate.getMonth() === calendarMonth && 
                                    todayDate.getFullYear() === calendarYear;

                    return (
                      <button
                        key={`day-${dayNum}`}
                        id={`btn-calendar-day-${dayDateStr}`}
                        type="button"
                        onClick={() => {
                          // Toggle date filter
                          setSelectedDateFilter(isSelected ? null : dayDateStr);
                        }}
                        className={`py-1 rounded relative flex flex-col items-center justify-center font-mono transition-all duration-100 cursor-pointer ${
                          isSelected 
                            ? 'bg-orange-600 text-white font-bold' 
                            : isToday 
                              ? 'border border-orange-500/50 text-orange-400 font-bold bg-orange-600/5' 
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                        title={hasPlans ? 'Contains Plan Uploads' : undefined}
                      >
                        <span>{dayNum}</span>
                        {hasPlans && (
                          <span className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected ? 'bg-white' : 'bg-orange-500 animate-pulse'
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Info Tip */}
                <div className="mt-2 pt-2 border-t border-[#232428] text-[9px] text-gray-500 leading-relaxed text-center">
                  Click highlighted dates above to isolate uploads.
                </div>
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div id="quick-filters-section" className="border-t border-[#2D2E33]/60 pt-4">
            <p id="filters-section-title" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 select-none">Quick Filter</p>
            <div className="space-y-3">
              <label id="lbl-filter-residential" className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                <input 
                  id="chk-filter-residential"
                  type="checkbox" 
                  checked={filterResidential} 
                  onChange={(e) => setFilterResidential(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500 cursor-pointer focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-gray-500" />
                  Residential Plans
                </span>
              </label>

              <label id="lbl-filter-commercial" className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                <input 
                  id="chk-filter-commercial"
                  type="checkbox" 
                  checked={filterCommercial} 
                  onChange={(e) => setFilterCommercial(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500 cursor-pointer focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  Commercial Plans
                </span>
              </label>

              <label id="lbl-filter-priority" className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                <input 
                  id="chk-filter-priority"
                  type="checkbox" 
                  checked={filterHighPriorityOnly} 
                  onChange={(e) => setFilterHighPriorityOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500 cursor-pointer focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  High Priority Only
                </span>
              </label>
            </div>
          </div>

          {/* Quick Active Search Box */}
          <div id="search-section" className="border-t border-[#2D2E33]/60 pt-4 mt-auto">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none">Active Search</p>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
              <input 
                id="search-input"
                type="text" 
                placeholder="Search plans, notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18191C] border border-[#2D2E33] rounded px-3 py-1.5 pl-8 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  id="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Right Dashboard Workspace Container */}
        <main id="main-content-stage" className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {activeTab === 'calendar' ? (
            <MoultonCalendar 
              projects={projects}
              setProjects={setProjects}
              getRepColor={getRepColor}
              onOpenManage={handleOpenManage}
              onOpenUpload={() => setIsAddModalOpen(true)}
              onCalendarProjectMove={(projName: string, type: 'received' | 'completed', dateStr: string) => {
                if (type === 'received') {
                  logActivity(currentRep, projName, 'calendar_move', `Rescheduled plan receipt date to ${dateStr} on the calendar`);
                } else {
                  logActivity(currentRep, projName, 'status_change', `Completed estimate and registered completed date as ${dateStr}`);
                }
              }}
            />
          ) : activeTab === 'analytics' ? (
            <SlaAnalytics 
              projects={projects}
              getRepColor={getRepColor}
            />
          ) : activeTab === 'logs' ? (
            <GlobalActivityLogs />
          ) : (
            <>
              {/* Headline Greeting with active filters indicator */}
              <div id="headline-bar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141518]/60 p-4 rounded-lg border border-[#2D2E33]/40">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>
                      {activeTab === 'board' && "Shared Delivery Board"}
                      {activeTab === 'archive' && "Archived Complete Estimations"}
                    </span>
                    {activeTab === 'board' && (
                      <span className="text-xs font-mono text-gray-500 font-normal hidden sm:inline">
                        ({boardView === 'kanban' ? 'Interactive Board' : 'Spreadsheet List'})
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time plan analysis, requirement checks, and estimate deployment state.
                  </p>
                </div>
                
                {/* View Toggles for Board */}
                <div className="flex items-center gap-2">
                  {activeTab === 'board' && (
                    <div className="flex bg-[#18191C] p-1 rounded-lg border border-[#2D2E33] mr-2">
                      <button
                        id="btn-board-view-kanban"
                        onClick={() => setBoardView('kanban')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                          boardView === 'kanban'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Switch to interactive Kanban cards dragging"
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Kanban Board</span>
                      </button>
                      <button
                        id="btn-board-view-table"
                        onClick={() => setBoardView('table')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                          boardView === 'table'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Switch to list spreadsheet mode"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">List Table</span>
                      </button>
                    </div>
                  )}

                  {/* Clear filters trigger indicator */}
                  {(statusFilter || selectedDateFilter || searchQuery || !filterResidential || !filterCommercial || filterHighPriorityOnly) && (
                    <button 
                      id="btn-clear-all-filters"
                      onClick={() => {
                        setStatusFilter(null);
                        setSelectedDateFilter(null);
                        setSearchQuery('');
                        setFilterResidential(true);
                        setFilterCommercial(true);
                        setFilterHighPriorityOnly(false);
                      }}
                      className="text-xs px-2.5 py-1.5 bg-orange-950/20 text-orange-400 border border-orange-700/20 rounded-md hover:bg-orange-900/30 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 KPI Cards Grid */}
              <div id="kpi-cards-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div 
                  id="kpi-card-incoming"
                  onClick={() => setStatusFilter(statusFilter === 'INCOMING' ? null : 'INCOMING')}
                  className={`bg-[#18191C] p-4 border rounded-lg transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                    statusFilter === 'INCOMING' 
                      ? 'border-yellow-500 ring-1 ring-yellow-500/25 bg-[#1C1C1F]' 
                      : 'border-[#2D2E33] hover:border-yellow-500/30 hover:bg-[#1C1D20]'
                  }`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Incoming</span>
                  </p>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-3xl font-bold font-mono text-white">{String(statIncoming).padStart(2, '0')}</h3>
                    <span className="text-[10px] text-gray-500 font-medium">Pending Entry</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-12 h-12 bg-yellow-500/5 rounded-tl-full pointer-events-none" />
                </div>

                <div 
                  id="kpi-card-estimating"
                  onClick={() => setStatusFilter(statusFilter === 'ESTIMATING' ? null : 'ESTIMATING')}
                  className={`bg-[#18191C] p-4 border rounded-lg transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                    statusFilter === 'ESTIMATING' 
                      ? 'border-orange-500 ring-1 ring-orange-500/25 bg-[#1C1C1F]' 
                      : 'border-[#2D2E33] hover:border-orange-500/30 hover:bg-[#1C1D20]'
                  }`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-orange-500" />
                    <span>Estimating</span>
                  </p>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-3xl font-bold font-mono text-orange-400">{String(statEstimating).padStart(2, '0')}</h3>
                    <span className="text-[10px] text-gray-500 font-medium">Active takeoff</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-12 h-12 bg-orange-500/5 rounded-tl-full pointer-events-none" />
                </div>

                <div 
                  id="kpi-card-quoting"
                  onClick={() => setStatusFilter(statusFilter === 'QUOTING' ? null : 'QUOTING')}
                  className={`bg-[#18191C] p-4 border rounded-lg transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                    statusFilter === 'QUOTING' 
                      ? 'border-blue-500 ring-1 ring-blue-500/25 bg-[#1C1C1F]' 
                      : 'border-[#2D2E33] hover:border-blue-500/30 hover:bg-[#1C1D20]'
                  }`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pending Quotes</span>
                  </p>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-3xl font-bold font-mono text-blue-400">{String(statQuoting).padStart(2, '0')}</h3>
                    <span className="text-[10px] text-gray-500 font-medium">Quoting Phase</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-12 h-12 bg-blue-500/5 rounded-tl-full pointer-events-none" />
                </div>

                <div 
                  id="kpi-card-completed"
                  onClick={() => setStatusFilter(statusFilter === 'COMPLETE' ? null : 'COMPLETE')}
                  className={`bg-[#18191C] p-4 border border-l-4 rounded-lg transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                    statusFilter === 'COMPLETE' 
                      ? 'border-l-green-500 border-green-500 ring-1 ring-green-500/25 bg-[#1C1C1F]' 
                      : 'border-[#2D2E33] border-l-green-500 hover:border-green-500/30 hover:bg-[#1C1D20]'
                  }`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>Completed</span>
                  </p>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-3xl font-bold font-mono text-green-400">{String(statCompleted).padStart(2, '0')}</h3>
                    <span className="text-[10px] text-gray-500 font-medium">Ready/Dispatched</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-12 h-12 bg-green-500/5 rounded-tl-full pointer-events-none" />
                </div>

              </div>

              {/* Active Status/Date Filter Indicator Pill */}
              {(statusFilter || selectedDateFilter) && (
                <div id="status-filter-alert" className="flex flex-wrap items-center justify-between gap-2 bg-[#1C1D21] border border-[#2D2E33] px-4 py-2.5 rounded-lg text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Filter className="w-3.5 h-3.5 text-orange-500" />
                      Active Filter:
                    </span>
                    
                    {statusFilter && (
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1.5 ${
                        statusFilter === 'INCOMING' ? 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/30' :
                        statusFilter === 'ESTIMATING' ? 'bg-orange-900/30 text-orange-400 border border-orange-700/30' :
                        statusFilter === 'QUOTING' ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30' :
                        'bg-green-900/30 text-green-400 border border-green-700/30'
                      }`}>
                        <span>Status: {statusFilter}</span>
                        <button onClick={() => setStatusFilter(null)} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    )}

                    {selectedDateFilter && (
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] tracking-wider bg-orange-950/40 text-orange-400 border border-orange-700/30 flex items-center gap-1.5">
                        <span>Date: {selectedDateFilter}</span>
                        <button onClick={() => setSelectedDateFilter(null)} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    )}
                  </div>

                  <button 
                    id="btn-remove-filters-alert"
                    onClick={() => { setStatusFilter(null); setSelectedDateFilter(null); }}
                    className="text-xs text-gray-500 hover:text-white underline font-semibold transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {/* TOGGLE VIEW: RENDERING KANBAN OR RENDERING LIST TABLE */}
              {activeTab === 'board' && boardView === 'kanban' ? (
                <MoultonKanban 
                  projects={filteredProjects}
                  setProjects={setProjects}
                  getRepColor={getRepColor}
                  onOpenManage={handleOpenManage}
                  presence={presence}
                  onProjectStatusChange={(projName: string, oldStatus: string, newStatus: string) => {
                    logActivity(currentRep, projName, 'status_change', `Dragged card and changed board status from ${oldStatus} to ${newStatus}`);
                  }}
                />
              ) : (
                /* Table Container */
                <div id="projects-table-card" className="flex-1 bg-[#18191C] border border-[#2D2E33] rounded-lg flex flex-col overflow-hidden shadow-xl">
                  
                  {/* Table Header Row */}
                  <div id="table-headers" className="grid grid-cols-12 p-4 border-b border-[#2D2E33] text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#15161A] select-none text-left items-center">
                    <div className="col-span-4 sm:col-span-3">Project / Salesman</div>
                    <div className="col-span-3 sm:col-span-2">Received</div>
                    <div className="col-span-3 sm:col-span-2">EWP / Truss / Win</div>
                    <div className="col-span-2 sm:col-span-2">Status</div>
                    <div className="hidden sm:block sm:col-span-2">Estimate Sent</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  {/* Table Body Row List */}
                  <div id="table-body" className="flex-1 overflow-y-auto min-h-[300px]">
                    
                    {filteredProjects.length === 0 ? (
                      <div id="no-projects-view" className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <AlertCircle className="w-12 h-12 text-gray-600 mb-3" />
                        <p className="text-sm font-semibold text-gray-400">No projects match the current filter selection</p>
                        <p className="text-xs text-gray-600 mt-1">Try adjusting the search query, categories, left calendar, or status KPI filters.</p>
                        <button 
                          id="btn-reset-on-empty"
                          onClick={() => {
                            setStatusFilter(null);
                            setSelectedDateFilter(null);
                            setSearchQuery('');
                            setFilterResidential(true);
                            setFilterCommercial(true);
                            setFilterHighPriorityOnly(false);
                            setActiveTab('board');
                          }}
                          className="mt-4 px-4 py-1.5 bg-[#232428] hover:bg-[#2D2E33] text-gray-300 text-xs font-semibold rounded transition-colors"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    ) : (
                      filteredProjects.map((project) => {
                        const isArchiveItem = project.status === 'COMPLETE';
                        return (
                          <div 
                            key={project.id}
                            id={`project-row-${project.id}`}
                            className={`grid grid-cols-12 p-4 border-b border-[#232428] items-center hover:bg-white/[0.02] transition-colors ${
                              isArchiveItem ? 'opacity-65' : ''
                            }`}
                          >
                            {/* Project Name and Representative */}
                            <div className="col-span-4 sm:col-span-3 flex flex-col pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-white font-bold text-sm tracking-wide">{project.name}</span>
                                {project.priority && (
                                  <span className="px-1.5 py-0.5 bg-orange-600/25 text-orange-500 rounded text-[9px] font-extrabold tracking-wider uppercase border border-orange-500/20">
                                    HIGH
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-600 inline" />
                                REP: {project.rep}
                                <span className="w-1 h-1 bg-gray-700 rounded-full inline-block mx-1"></span>
                                <span className="text-gray-600 uppercase text-[9px]">{project.type}</span>
                              </span>
                            </div>

                            {/* Received Date/Time */}
                            <div className="col-span-3 sm:col-span-2 font-mono text-xs text-gray-400">
                              {project.receivedAt}
                            </div>

                            {/* EWP / Truss / Windows Indicators */}
                            <div className="col-span-3 sm:col-span-2 flex gap-1 items-center">
                              <div className="tooltip relative group">
                                <span className={`w-5 h-5 rounded text-center leading-5 text-[10px] font-bold border block select-none ${
                                  project.ewp 
                                    ? 'bg-green-500/15 text-green-400 border-green-500/20' 
                                    : 'bg-red-500/10 text-red-500/70 border-red-500/10'
                                }`}>
                                  {project.ewp ? 'Y' : 'N'}
                                </span>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1D21] border border-[#2D2E33] text-[9px] text-gray-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                  EWP Required
                                </span>
                              </div>

                              <div className="tooltip relative group">
                                <span className={`w-5 h-5 rounded text-center leading-5 text-[10px] font-bold border block select-none ${
                                  project.trusses 
                                    ? 'bg-green-500/15 text-green-400 border-green-500/20' 
                                    : 'bg-red-500/10 text-red-500/70 border-red-500/10'
                                }`}>
                                  {project.trusses ? 'Y' : 'N'}
                                </span>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1D21] border border-[#2D2E33] text-[9px] text-gray-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                  Trusses Required
                                </span>
                              </div>

                              <div className="tooltip relative group">
                                <span className={`w-5 h-5 rounded text-center leading-5 text-[10px] font-bold border block select-none ${
                                  project.windows 
                                    ? 'bg-green-500/15 text-green-400 border-green-500/20' 
                                    : 'bg-red-500/10 text-red-500/70 border-red-500/10'
                                }`}>
                                  {project.windows ? 'Y' : 'N'}
                                </span>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1D21] border border-[#2D2E33] text-[9px] text-gray-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                  Windows Required
                                </span>
                              </div>
                            </div>

                            {/* Status pill badge */}
                            <div className="col-span-2 sm:col-span-2">
                              <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-semibold tracking-wider uppercase select-none ${
                                project.status === 'INCOMING' ? 'bg-yellow-900/20 text-yellow-500 border-yellow-700/30' :
                                project.status === 'ESTIMATING' ? 'bg-orange-900/30 text-orange-400 border-orange-700/30' :
                                project.status === 'QUOTING' ? 'bg-blue-900/30 text-blue-400 border-blue-700/30' :
                                'bg-green-900/30 text-green-400 border-green-700/30'
                              }`}>
                                {project.status}
                              </span>
                            </div>

                            {/* Estimate Sent Timestamp */}
                            <div className="hidden sm:block sm:col-span-2 font-mono text-xs text-gray-400">
                              {project.estimateSentAt || <span className="text-gray-700">--</span>}
                            </div>

                            {/* Action buttons */}
                            <div className="col-span-1 text-right">
                              <button 
                                id={`btn-manage-${project.id}`}
                                onClick={() => handleOpenManage(project)}
                                className="text-orange-500 underline text-xs font-semibold cursor-pointer hover:text-orange-400 active:scale-95 transition-all inline-block select-none"
                              >
                                Manage
                              </button>
                            </div>

                          </div>
                        );
                      })
                    )}

                  </div>

                  {/* Footer with counts and help indicator */}
                  <div id="table-footer" className="p-3 bg-[#131417] border-t border-[#2D2E33] text-[10px] text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2 select-none">
                    <span>Showing {filteredProjects.length} of {projects.length} loaded plan estimations</span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Check className="w-3.5 h-3.5 text-orange-500" />
                      Click `Manage` to change plan checklist and status variables in real-time
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Plan Requirements Dialog / Manage Modal (as specified in Design HTML) */}
      {isManageModalOpen && selectedProject && (
        <div id="modal-requirements" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1D21] w-full max-w-[420px] border border-[#3D3E43] shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-orange-600 flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="text-white font-extrabold text-sm uppercase tracking-widest flex items-center gap-2">
                  <span>Plan Requirements</span>
                  {selectedProject.priority && (
                    <span className="bg-black/40 text-orange-300 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">High Priority</span>
                  )}
                </h2>
                <span className="text-white/80 text-[11px] font-mono mt-0.5 font-bold">{selectedProject.name}</span>
              </div>
              <span className="text-white/60 text-xs font-mono font-bold bg-orange-850 px-2 py-1 rounded">ID: {selectedProject.id.toUpperCase()}</span>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              <p className="text-xs text-gray-400 italic">
                Please confirm additional quoting requirements for these plans before adding to queue:
              </p>

              {/* Requirement 1: EWP */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">Is there EWP?</span>
                <div className="flex bg-[#111] rounded p-1 border border-[#2D2E33]">
                  <button 
                    id="btn-req-ewp-yes"
                    type="button"
                    onClick={() => handleUpdateRequirement('ewp', true)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      selectedProject.ewp 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    YES
                  </button>
                  <button 
                    id="btn-req-ewp-no"
                    type="button"
                    onClick={() => handleUpdateRequirement('ewp', false)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      !selectedProject.ewp 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Requirement 2: Trusses */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">Are there Trusses?</span>
                <div className="flex bg-[#111] rounded p-1 border border-[#2D2E33]">
                  <button 
                    id="btn-req-trusses-yes"
                    type="button"
                    onClick={() => handleUpdateRequirement('trusses', true)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      selectedProject.trusses 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    YES
                  </button>
                  <button 
                    id="btn-req-trusses-no"
                    type="button"
                    onClick={() => handleUpdateRequirement('trusses', false)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      !selectedProject.trusses 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Requirement 3: Windows */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">Are there Windows?</span>
                <div className="flex bg-[#111] rounded p-1 border border-[#2D2E33]">
                  <button 
                    id="btn-req-windows-yes"
                    type="button"
                    onClick={() => handleUpdateRequirement('windows', true)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      selectedProject.windows 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    YES
                  </button>
                  <button 
                    id="btn-req-windows-no"
                    type="button"
                    onClick={() => handleUpdateRequirement('windows', false)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      !selectedProject.windows 
                        ? 'bg-gray-700 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Requirement 4: Sent for quote? */}
              <div className="pt-3 border-t border-gray-800/60 flex items-center justify-between">
                <span className="text-sm font-bold text-orange-400">Sent for quote?</span>
                <div className="flex bg-[#111] rounded p-1 border border-[#2D2E33]">
                  <button 
                    id="btn-req-sent-yes"
                    type="button"
                    onClick={() => handleUpdateRequirement('sentForQuote', true)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      selectedProject.sentForQuote 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    YES
                  </button>
                  <button 
                    id="btn-req-sent-no"
                    type="button"
                    onClick={() => handleUpdateRequirement('sentForQuote', false)}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded transition-all ${
                      !selectedProject.sentForQuote 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    NOT YET
                  </button>
                </div>
              </div>

              {/* Edit Status directly in Manage Modal */}
              <div className="pt-3 border-t border-gray-800/60 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Set Board Status State</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['INCOMING', 'ESTIMATING', 'QUOTING', 'COMPLETE'] as const).map((status) => (
                    <button
                      key={status}
                      id={`btn-status-switch-${status}`}
                      type="button"
                      onClick={() => handleUpdateRequirement('status', status)}
                      className={`py-1.5 rounded text-[9px] font-bold border transition-all ${
                        selectedProject.status === status
                          ? status === 'INCOMING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                            status === 'ESTIMATING' ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-950/20' :
                            status === 'QUOTING' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-950/20' :
                            'bg-green-600 text-white border-green-600 shadow-md shadow-green-950/20'
                          : 'bg-[#141518] border-[#2D2E33] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment representative and notes */}
              <div className="space-y-3 pt-3 border-t border-gray-800/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Sales Rep</label>
                    <select
                      id="edit-project-rep"
                      value={selectedProject.rep}
                      onChange={(e) => handleUpdateRequirement('rep', e.target.value)}
                      className="w-full bg-[#141518] border border-[#2D2E33] text-xs text-white rounded p-2 focus:outline-none focus:border-orange-500"
                    >
                      {allReps.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Project Type</label>
                    <select
                      id="edit-project-type"
                      value={selectedProject.type}
                      onChange={(e) => handleUpdateRequirement('type', e.target.value)}
                      className="w-full bg-[#141518] border border-[#2D2E33] text-xs text-white rounded p-2 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                {/* Edit notes */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Project Notes / Takeoff Details</label>
                  <textarea
                    id="edit-project-notes"
                    value={selectedProject.notes || ''}
                    onChange={(e) => handleUpdateRequirement('notes', e.target.value)}
                    rows={2}
                    placeholder="Add special requests, specs or instructions..."
                    className="w-full bg-[#141518] border border-[#2D2E33] text-xs text-white rounded p-2 focus:outline-none focus:border-orange-500 resize-none placeholder-gray-650"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    id="edit-project-priority"
                    type="checkbox"
                    checked={selectedProject.priority}
                    onChange={(e) => handleUpdateRequirement('priority', e.target.checked)}
                    className="w-4 h-4 rounded border-[#2D2E33] bg-[#141518] text-orange-600 accent-orange-500 cursor-pointer focus:ring-0"
                  />
                  <label htmlFor="edit-project-priority" className="text-xs text-gray-300 cursor-pointer font-medium select-none">
                    Mark as High Priority Plan
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-800/60 flex gap-2">
                <button 
                  id="btn-delete-project"
                  type="button"
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className="px-3 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                  title="Remove Project from Board"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  id="btn-cancel-requirements"
                  type="button"
                  onClick={() => { setIsManageModalOpen(false); setSelectedProject(null); }}
                  className="flex-1 py-3 bg-[#232428] hover:bg-[#2D2E33] text-gray-300 font-bold rounded-lg text-xs transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  id="btn-submit-requirements"
                  type="button"
                  onClick={handleSaveProjectEdits}
                  className="flex-[2] py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-xl shadow-orange-900/20 text-xs transition-all active:scale-95"
                >
                  SUBMIT TO BOARD
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Plan Upload Modal Dialog - Formatted for clicking predefined names */}
      {isAddModalOpen && (
        <div id="modal-upload-plan" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1D21] w-full max-w-lg border border-[#3D3E43] shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-orange-600 flex justify-between items-center text-white">
              <h2 className="font-extrabold text-sm uppercase tracking-widest">Upload Plan Estimating Spec</h2>
              <button 
                id="btn-close-upload-modal"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Project Name / Site Address</label>
                <input 
                  id="add-proj-name"
                  type="text"
                  required
                  placeholder="e.g. Higgins Residence, Oakwood Manor Ph II"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-[#141518] border border-[#2D2E33] rounded p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Clickable Representative Selection Grid (As Requested) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Click Your Name (Salesperson)</label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PREDEFINED_REPS.map((repName) => {
                    const isSelected = !isCustomRepActive && newProjRep === repName;
                    return (
                      <button
                        key={repName}
                        id={`btn-select-rep-${repName.replace(/\s+/g, '-')}`}
                        type="button"
                        onClick={() => {
                          setNewProjRep(repName);
                          setIsCustomRepActive(false);
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-950/15' 
                            : 'bg-[#141518] border-[#2D2E33] text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <span className="truncate">{repName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                  
                  {/* Fill-in Name option (As Requested) */}
                  <button
                    id="btn-select-rep-custom"
                    type="button"
                    onClick={() => {
                      setIsCustomRepActive(true);
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all flex items-center justify-between ${
                      isCustomRepActive 
                        ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-950/15' 
                        : 'bg-[#141518] border-[#2D2E33] text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <span>Other (Write-in)</span>
                    {isCustomRepActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                </div>

                {/* Custom rep input spot appears when clicking 'Other' */}
                {isCustomRepActive && (
                  <div className="pt-2 animate-in slide-in-from-top-1 duration-150">
                    <input 
                      id="custom-rep-input"
                      type="text"
                      required={isCustomRepActive}
                      placeholder="Type your name here..."
                      value={customRepName}
                      onChange={(e) => setCustomRepName(e.target.value)}
                      className="w-full bg-[#141518] border border-orange-500/60 rounded p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Building Classification</label>
                  <select 
                    id="add-proj-type"
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value as any)}
                    className="w-full bg-[#141518] border border-[#2D2E33] rounded p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Initial Board Status</label>
                  <select 
                    id="add-proj-status"
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value as any)}
                    className="w-full bg-[#141518] border border-[#2D2E33] rounded p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="INCOMING">INCOMING</option>
                    <option value="ESTIMATING">ESTIMATING</option>
                    <option value="QUOTING">QUOTING</option>
                    <option value="COMPLETE">COMPLETE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  id="add-proj-priority"
                  type="checkbox"
                  checked={newProjPriority}
                  onChange={(e) => setNewProjPriority(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2D2E33] bg-[#141518] text-orange-600 accent-orange-500 cursor-pointer focus:ring-0"
                />
                <label htmlFor="add-proj-priority" className="text-xs text-gray-300 font-medium select-none cursor-pointer">
                  Mark as High Priority Takeoff
                </label>
              </div>

              {/* Requirement Checkboxes */}
              <div className="border-t border-[#2D2E33] pt-4 mt-2 space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Plan Specifications Requirements</label>
                
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 bg-[#141518] p-2 rounded border border-[#2D2E33] text-xs cursor-pointer select-none">
                    <input 
                      id="chk-add-ewp"
                      type="checkbox"
                      checked={newProjEwp}
                      onChange={(e) => setNewProjEwp(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500"
                    />
                    <span>EWP</span>
                  </label>

                  <label className="flex items-center gap-2 bg-[#141518] p-2 rounded border border-[#2D2E33] text-xs cursor-pointer select-none">
                    <input 
                      id="chk-add-trusses"
                      type="checkbox"
                      checked={newProjTrusses}
                      onChange={(e) => setNewProjTrusses(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500"
                    />
                    <span>Trusses</span>
                  </label>

                  <label className="flex items-center gap-2 bg-[#141518] p-2 rounded border border-[#2D2E33] text-xs cursor-pointer select-none">
                    <input 
                      id="chk-add-windows"
                      type="checkbox"
                      checked={newProjWindows}
                      onChange={(e) => setNewProjWindows(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500"
                    />
                    <span>Windows</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 bg-[#141518] p-2.5 rounded border border-[#2D2E33] text-xs cursor-pointer select-none mt-2">
                  <input 
                    id="chk-add-sent-quote"
                    type="checkbox"
                    checked={newProjSentQuote}
                    onChange={(e) => setNewProjSentQuote(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2D2E33] bg-[#18191C] text-orange-600 accent-orange-500"
                  />
                  <span className="font-bold text-orange-400">Directly dispatch to quoting? (Sent for quote)</span>
                </label>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Add Takeoff Notes / Details</label>
                <textarea 
                  id="add-proj-notes"
                  rows={2}
                  placeholder="e.g. Include truss calcs, delivery schedule constraints..."
                  value={newProjNotes}
                  onChange={(e) => setNewProjNotes(e.target.value)}
                  className="w-full bg-[#141518] border border-[#2D2E33] rounded p-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-[#2D2E33] flex gap-3">
                <button 
                  id="btn-add-form-cancel"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#232428] hover:bg-[#2D2E33] text-gray-300 font-bold rounded-lg text-xs transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  id="btn-add-form-submit"
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-xl shadow-orange-900/20 text-xs transition-all active:scale-95"
                >
                  UPLOAD TO BOARD
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Multi-user Sharing Options Informational Dialog */}
      {isSharingInfoModalOpen && (
        <div id="modal-sharing-info" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1D21] w-full max-w-lg border border-[#3D3E43] shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-200">
            
            {/* Header */}
            <div className="p-4 bg-orange-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <CloudLightning className="w-5 h-5 text-yellow-300" />
                <h2 className="font-extrabold text-sm uppercase tracking-widest">Multi-User Database Sharing</h2>
              </div>
              <button 
                id="btn-close-sharing-modal"
                onClick={() => setIsSharingInfoModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm leading-relaxed text-gray-300">
              <p className="text-gray-400">
                You asked a great question: <strong className="text-white">"What are the issues about having all the sales people see the same site?"</strong>
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div>
                    <strong className="text-green-400 block">Active Status: Live Cloud Database Enabled!</strong>
                    The application is now fully connected to a secure **Firebase Firestore Cloud Database**! Local isolation is resolved. Any change is instantly broadcast to everyone.
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white block">Team Collaboration Features</strong>
                    With this active Firestore integration:
                    <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-gray-400">
                      <li>When Larry or Ryan clicks their name and uploads a plan on their phone, it is saved instantly to the secure cloud database.</li>
                      <li>The plan will immediately pop up on your screen and automatically populate your team calendar in real-time.</li>
                      <li>Any drag-and-drop movement on the Kanban Board or Calendar from any salesperson instantly updates the central dashboard for the whole team.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#141518] p-3 rounded border border-[#2D2E33] text-xs space-y-2 mt-4 text-gray-400">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Successfully Configured
                </p>
                <p>
                  No further action is required! You can now share the **Shared App URL** with Larry, Ryan, Josh, and the rest of your sales team to collaborate on estimation queues in real-time.
                </p>
              </div>

              <div className="pt-4 border-t border-[#2D2E33] flex justify-end">
                <button 
                  id="btn-close-sharing"
                  type="button"
                  onClick={() => setIsSharingInfoModalOpen(false)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition-colors active:scale-95"
                >
                  AWESOME!
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Toast Alert Notification for Multi-User synchronization activities (Idea 1) */}
      {toast && (
        <div id="live-sync-toast" className="fixed bottom-6 right-6 z-50 bg-[#1C1F28] border border-orange-500/50 text-white rounded-lg p-4 shadow-2xl flex items-center gap-3.5 animate-bounce max-w-sm">
          <div className="p-2 rounded bg-orange-600/10 border border-orange-500/20 text-orange-400">
            <CloudLightning className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-orange-500">Live Team Broadcast</h5>
            <p className="text-xs text-gray-300 font-semibold mt-0.5 leading-relaxed">{toast}</p>
          </div>
          <button 
            id="btn-close-toast"
            onClick={() => setToast(null)}
            className="text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
