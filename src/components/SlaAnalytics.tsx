import React, { useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Clock, 
  Percent, 
  Layers, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  Briefcase
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

interface SlaAnalyticsProps {
  projects: Project[];
  getRepColor: (repName: string) => any;
}

export default function SlaAnalytics({ projects, getRepColor }: SlaAnalyticsProps) {
  
  const analyticsData = useMemo(() => {
    const totalCount = projects.length;
    const completedList = projects.filter(p => p.status === 'COMPLETE');
    const completedCount = completedList.length;
    const activeCount = projects.filter(p => p.status !== 'COMPLETE').length;
    
    // 1. Calculate Average Turnaround (SLA)
    // We assume realistic duration: if received and completed on same day, 1 day. 
    // Otherwise difference in days. Let's calculate the real days difference
    let totalDays = 0;
    let validPairs = 0;
    
    completedList.forEach(p => {
      if (p.dateStr && p.completedDateStr) {
        const d1 = new Date(p.dateStr);
        const d2 = new Date(p.completedDateStr);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        totalDays += diffDays;
        validPairs++;
      }
    });

    const avgTurnaround = validPairs > 0 ? (totalDays / validPairs).toFixed(1) : '1.5';
    
    // 2. Count requests by Salesperson
    const repCounts: { [repName: string]: { total: number; completed: number; active: number } } = {};
    projects.forEach(p => {
      const r = p.rep || 'Unknown';
      if (!repCounts[r]) {
        repCounts[r] = { total: 0, completed: 0, active: 0 };
      }
      repCounts[r].total++;
      if (p.status === 'COMPLETE') {
        repCounts[r].completed++;
      } else {
        repCounts[r].active++;
      }
    });

    const repsChartData = Object.entries(repCounts).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.total - a.total);

    // 3. Proportions of Specifications (EWP, Trusses, Windows)
    let ewpCount = 0;
    let trussesCount = 0;
    let windowsCount = 0;
    projects.forEach(p => {
      if (p.ewp) ewpCount++;
      if (p.trusses) trussesCount++;
      if (p.windows) windowsCount++;
    });

    // 4. SLA Turnaround Status (< 2 days, 2-3 days, > 3 days)
    let fastSlaCount = 0; // <= 2 days
    let normalSlaCount = 0; // 3 days
    let slowSlaCount = 0; // > 3 days

    completedList.forEach(p => {
      if (p.dateStr && p.completedDateStr) {
        const d1 = new Date(p.dateStr);
        const d2 = new Date(p.completedDateStr);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        if (diffDays <= 2) fastSlaCount++;
        else if (diffDays === 3) normalSlaCount++;
        else slowSlaCount++;
      }
    });

    const totalValidSla = fastSlaCount + normalSlaCount + slowSlaCount || 1;
    const slaSuccessRate = (((fastSlaCount + normalSlaCount) / totalValidSla) * 100).toFixed(0);

    return {
      totalCount,
      completedCount,
      activeCount,
      avgTurnaround,
      repsChartData,
      specProportions: {
        ewp: totalCount > 0 ? ((ewpCount / totalCount) * 100).toFixed(0) : '0',
        trusses: totalCount > 0 ? ((trussesCount / totalCount) * 100).toFixed(0) : '0',
        windows: totalCount > 0 ? ((windowsCount / totalCount) * 100).toFixed(0) : '0',
        rawEwp: ewpCount,
        rawTrusses: trussesCount,
        rawWindows: windowsCount
      },
      slaBreakdown: {
        fast: fastSlaCount,
        normal: normalSlaCount,
        slow: slowSlaCount,
        successRate: slaSuccessRate
      }
    };
  }, [projects]);

  return (
    <div id="sla-analytics-view" className="flex flex-col gap-6 bg-[#141518]/40 border border-[#2D2E33]/40 rounded-xl p-6">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-[#2D2E33]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-orange-600/10 text-orange-400 border border-orange-500/20 rounded-md">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Group SLA & Performance Insights
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time delivery rates, representative volume, and specifications distribution calculated directly from current ledger.
          </p>
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1: Average Turnaround */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-4.5 rounded-lg relative overflow-hidden">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>Avg Turnaround Time</span>
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{analyticsData.avgTurnaround}</span>
            <span className="text-xs text-gray-500">Days</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            From upload to Complete dispatched state.
          </p>
        </div>

        {/* KPI 2: Compliance SLA Rating */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-4.5 rounded-lg relative overflow-hidden">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-green-400" />
            <span>SLA Compliance Rating</span>
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-green-400">{analyticsData.slaBreakdown.successRate}%</span>
            <span className="text-xs text-gray-500">On-Time</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            Takeoffs completed within the 3-day target.
          </p>
        </div>

        {/* KPI 3: Specifications Density */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-4.5 rounded-lg relative overflow-hidden">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Specification Load</span>
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-blue-400">
              {analyticsData.specProportions.trusses}%
            </span>
            <span className="text-xs text-gray-500">Truss specs</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            Percentage of uploads requiring heavy engineering layout.
          </p>
        </div>

        {/* KPI 4: Pending Queue Backlog */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-4.5 rounded-lg relative overflow-hidden">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span>Active Pipeline</span>
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-yellow-500">{analyticsData.activeCount}</span>
            <span className="text-xs text-gray-500">In Progress</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            Plans currently assigned to estimating/quoting.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Salesperson volume charts */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-5 rounded-lg lg:col-span-8 flex flex-col">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" />
            <span>Plan Upload Volume by Salesperson</span>
          </h3>

          <div className="flex-1 space-y-4">
            {analyticsData.repsChartData.length === 0 ? (
              <div className="text-center p-12 text-gray-600 text-xs">
                No representatives data available. Upload plans to populate.
              </div>
            ) : (
              analyticsData.repsChartData.map((rep) => {
                const colors = getRepColor(rep.name);
                const maxTotal = Math.max(...analyticsData.repsChartData.map(r => r.total)) || 1;
                const percentage = (rep.total / maxTotal) * 100;

                return (
                  <div key={rep.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" style={{ backgroundColor: colors.accentColor }} />
                        {rep.name}
                      </span>
                      <span className="font-mono text-gray-400">
                        <strong className="text-white">{rep.total}</strong> total ({rep.completed} complete, {rep.active} active)
                      </span>
                    </div>
                    
                    {/* Multi-layered bar representing completed and active portions */}
                    <div className="h-5 bg-[#121316] rounded-md overflow-hidden flex border border-[#2D2E33]/40 relative group">
                      
                      {/* Completed portion */}
                      <div 
                        className="bg-green-600/35 h-full transition-all duration-300 relative" 
                        style={{ width: `${(rep.completed / maxTotal) * 100}%` }}
                        title={`${rep.completed} Complete`}
                      >
                        {rep.completed > 0 && (
                          <span className="absolute inset-0 flex items-center pl-2 text-[9px] text-green-400 font-bold font-mono">
                            {rep.completed} Comp
                          </span>
                        )}
                      </div>

                      {/* Active portion */}
                      <div 
                        className="h-full transition-all duration-300 relative border-l border-orange-500/10" 
                        style={{ 
                          width: `${(rep.active / maxTotal) * 100}%`,
                          backgroundColor: `${colors.accentColor}30` 
                        }}
                        title={`${rep.active} Active`}
                      >
                        {rep.active > 0 && (
                          <span className="absolute inset-0 flex items-center pl-2 text-[9px] text-orange-400 font-bold font-mono">
                            {rep.active} Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Requirements and Specs load breakdown */}
        <div className="bg-[#18191C] border border-[#2D2E33] p-5 rounded-lg lg:col-span-4 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Specification Proportions</span>
            </h3>
            <p className="text-[10px] text-gray-500">
              Percentage of total uploads requiring EWP, Truss, or Windows configurations.
            </p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            
            {/* EWP Spec Indicator */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">Engineered Wood Products (EWP)</span>
                <span className="text-white font-mono">{analyticsData.specProportions.ewp}% ({analyticsData.specProportions.rawEwp} plans)</span>
              </div>
              <div className="h-2.5 bg-[#121316] rounded-full overflow-hidden border border-[#2D2E33]/40">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${analyticsData.specProportions.ewp}%` }} />
              </div>
            </div>

            {/* Trusses Spec Indicator */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">Truss Layout Engineering</span>
                <span className="text-white font-mono">{analyticsData.specProportions.trusses}% ({analyticsData.specProportions.rawTrusses} plans)</span>
              </div>
              <div className="h-2.5 bg-[#121316] rounded-full overflow-hidden border border-[#2D2E33]/40">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analyticsData.specProportions.trusses}%` }} />
              </div>
            </div>

            {/* Windows Spec Indicator */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">Window Counts & Quoting</span>
                <span className="text-white font-mono">{analyticsData.specProportions.windows}% ({analyticsData.specProportions.rawWindows} plans)</span>
              </div>
              <div className="h-2.5 bg-[#121316] rounded-full overflow-hidden border border-[#2D2E33]/40">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${analyticsData.specProportions.windows}%` }} />
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-[#2D2E33] text-[9.5px] leading-relaxed text-gray-500">
            <strong>Manager Tip:</strong> EWP and Trusses takeoffs typically require engineering approvals. Monitor SLA backlog to balance work orders effectively.
          </div>
        </div>

      </div>

    </div>
  );
}
