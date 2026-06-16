import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import KPICard from '@/components/KPICard';
import {
  HeartPulse, TrendingUp, ClipboardList, ArrowRight, CalendarDays,
  Users, AlertTriangle, Clock, UserCheck, Activity, Bed
} from 'lucide-react';
import {
  mockPatients, mockClinicalRecords, mockOvertimeRequests,
  mockAttendanceRecords, riskColorMap, dependencyGradeMap, mockDischarges
} from '@/data/mockData';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [compareDate, setCompareDate] = useState<string>('');

  // Computed stats
  const totalPatients = mockPatients.length;
  const highRiskRecords = mockClinicalRecords.filter(
    r => r.risk === 'Urgente' || r.risk === 'Muito Urgente' || r.risk === 'Emergência'
  );
  const pendingRequests = mockOvertimeRequests.filter(r => r.status === 'Pendente').length;
  const onDuty = mockAttendanceRecords.filter(r => r.status === 'Normal' && !r.exit).length;
  const absentToday = mockAttendanceRecords.filter(r => r.status === 'Falta').length;
  const lateToday = mockAttendanceRecords.filter(r => r.status === 'Atraso').length;

  // Discharge stats
  const obitos = mockDischarges.filter(d => d.reason === 'Óbito').length;
  const transferencias = mockDischarges.filter(d => d.reason === 'Transferência').length;
  const altas = mockDischarges.filter(d => d.reason === 'Alta').length;

  // Risk distribution for donut chart
  const riskCounts: Record<string, number> = {};
  mockClinicalRecords.forEach(r => {
    riskCounts[r.risk] = (riskCounts[r.risk] || 0) + 1;
  });
  const totalRecords = mockClinicalRecords.length;

  // Dependency grade distribution
  const gradeCounts = [0, 0, 0, 0]; // index 1-3
  mockPatients.forEach(p => { gradeCounts[p.dependencyGrade]++; });

  // Donut chart helper
  const donutSegments = Object.entries(riskCounts).map(([risk, count]) => {
    const colors = riskColorMap[risk];
    const hex = colors?.bg?.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#999';
    return { risk, count, hex, pct: totalRecords > 0 ? (count / totalRecords) * 100 : 0 };
  });

  let cumulativeAngle = 0;
  const donutArcs = donutSegments.map(seg => {
    const startAngle = cumulativeAngle;
    const sweepAngle = (seg.pct / 100) * 360;
    cumulativeAngle += sweepAngle;
    return { ...seg, startAngle, sweepAngle };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, sweepAngle: number) => {
    if (sweepAngle >= 360) sweepAngle = 359.99;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, startAngle + sweepAngle);
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const card = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  });

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Dashboard Administrador">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-[#003D5C]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Filtro de Comparação (DE PARA)</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#666666]">Data Atual: Hoje</span>
          <span className="text-[#E5E5E5]">|</span>
          <span className="text-xs font-medium text-[#666666]">Comparar com:</span>
          <input 
            type="date" 
            value={compareDate}
            onChange={e => setCompareDate(e.target.value)}
            className="h-9 px-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-lg text-sm text-[#1A1A1A] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total de Pacientes" value={totalPatients} icon={Users} color="#003D5C" delay={0} trend={compareDate ? 5 : undefined} />
        <KPICard label="Registros Clínicos" value={totalRecords} icon={ClipboardList} color="#7C9DB5" delay={0.1} trend={compareDate ? 12 : undefined} />
        <KPICard label="Alertas de Risco" value={highRiskRecords.length} icon={AlertTriangle} color="#DC3545" delay={0.2} trend={compareDate ? -8 : undefined} />
        <KPICard label="Solicitações Pendentes" value={pendingRequests} icon={Clock} color="#F0AD4E" delay={0.3} trend={compareDate ? 2 : undefined} />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Em Serviço Agora" value={onDuty} icon={UserCheck} color="#28A745" delay={0.15} trend={compareDate ? 0 : undefined} />
        <KPICard label="Atrasos Hoje" value={lateToday} icon={Activity} color="#F0AD4E" delay={0.25} trend={compareDate ? -15 : undefined} />
        <KPICard label="Faltas Hoje" value={absentToday} icon={AlertTriangle} color="#DC3545" delay={0.35} trend={compareDate ? 0 : undefined} />
        <KPICard label="Taxa de Ocupação" value="85%" icon={Bed} color="#003D5C" delay={0.45} trend={compareDate ? 2 : undefined} />
      </div>

      {/* Third KPI Row (Saídas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard label="Óbitos (Histórico)" value={obitos} icon={AlertTriangle} color="#1A1A1A" delay={0.5} trend={compareDate ? 0 : undefined} />
        <KPICard label="Transferências" value={transferencias} icon={ArrowRight} color="#7C9DB5" delay={0.6} trend={compareDate ? 5 : undefined} />
        <KPICard label="Altas / Desligamentos" value={altas} icon={UserCheck} color="#28A745" delay={0.7} trend={compareDate ? 10 : undefined} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Risk Distribution Donut */}
        <motion.div {...card(0.2)} className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-[#003D5C] mb-4">Distribuição de Risco</h3>
          <div className="flex items-center gap-8">
            {/* Donut SVG */}
            <div className="relative flex-shrink-0">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {donutArcs.map((arc, i) => (
                  <path
                    key={i}
                    d={describeArc(80, 80, 55, arc.startAngle, arc.sweepAngle)}
                    fill="none"
                    stroke={arc.hex}
                    strokeWidth="22"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                ))}
                <text x="80" y="75" textAnchor="middle" className="fill-[#1A1A1A] text-2xl font-bold" style={{ fontSize: '28px', fontWeight: 700 }}>
                  {totalRecords}
                </text>
                <text x="80" y="95" textAnchor="middle" className="fill-[#666666]" style={{ fontSize: '11px' }}>
                  registros
                </text>
              </svg>
            </div>
            {/* Legend */}
            <div className="space-y-2 flex-1">
              {donutSegments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.hex }} />
                    <span className="text-sm text-[#1A1A1A]">{seg.risk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{seg.count}</span>
                    <span className="text-xs text-[#666666]">({seg.pct.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Dependency Grade Distribution */}
        <motion.div {...card(0.3)} className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-[#003D5C] mb-4">Distribuição por Grau de Dependência</h3>
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map(grade => {
              const info = dependencyGradeMap[grade];
              const count = gradeCounts[grade];
              const pct = totalPatients > 0 ? (count / totalPatients) * 100 : 0;
              const barColor = info.text.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#999';
              return (
                <div key={grade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[#1A1A1A] font-medium">{info.label} — {info.tag}</span>
                    <span className="text-sm font-semibold text-[#1A1A1A]">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + grade * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-[#E5E5E5]">
            <p className="text-xs text-[#666666]">Classificação conforme RDC ANVISA 283/2005</p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <motion.div {...card(0.4)} className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#003D5C] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC3545]" />
              Alertas Recentes
            </h3>
            <button
              onClick={() => navigate('/admin/clinico')}
              className="text-xs text-[#7C9DB5] hover:text-[#003D5C] flex items-center gap-1 cursor-pointer"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {highRiskRecords.slice(0, 4).map((record, i) => {
              const riskColors = riskColorMap[record.risk] || riskColorMap['Urgente'];
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl hover:bg-[#F5F5F5] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: riskColors.bg.match(/#[A-Fa-f0-9]{6,}/)?.[0] || '#DC3545' }} />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{record.patientName}</p>
                      <p className="text-xs text-[#666666]">{record.dateTime} — {record.nurseName}</p>
                    </div>
                  </div>
                  <span className={`${riskColors.bg} ${riskColors.text} text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap`}>
                    {record.risk}
                  </span>
                </div>
              );
            })}
            {highRiskRecords.length === 0 && (
              <p className="text-sm text-[#666666] text-center py-4">Nenhum alerta ativo.</p>
            )}
          </div>
        </motion.div>

        {/* Attendance Summary */}
        <motion.div {...card(0.5)} className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#003D5C] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7C9DB5]" />
              Ponto do Dia
            </h3>
            <button
              onClick={() => navigate('/admin/comportamental')}
              className="text-xs text-[#7C9DB5] hover:text-[#003D5C] flex items-center gap-1 cursor-pointer"
            >
              Ver completo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Pills */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#28A745]/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#28A745]">{onDuty}</p>
              <p className="text-[11px] text-[#666666] mt-0.5">Em serviço</p>
            </div>
            <div className="bg-[#F0AD4E]/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#F0AD4E]">{lateToday}</p>
              <p className="text-[11px] text-[#666666] mt-0.5">Atrasos</p>
            </div>
            <div className="bg-[#DC3545]/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#DC3545]">{absentToday}</p>
              <p className="text-[11px] text-[#666666] mt-0.5">Faltas</p>
            </div>
          </div>

          {/* Mini attendance list */}
          <div className="space-y-2">
            {mockAttendanceRecords.slice(0, 4).map((rec, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#FAFAFA] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    rec.status === 'Normal' ? 'bg-[#28A745]' : rec.status === 'Atraso' ? 'bg-[#F0AD4E]' : 'bg-[#DC3545]'
                  }`} />
                  <span className="text-sm text-[#1A1A1A]">{rec.employee}</span>
                </div>
                <span className="text-xs text-[#666666]">{rec.entry} → {rec.exit || 'em serviço'}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { title: 'Acompanhamento Clínico', desc: 'Monitoramento de sinais vitais e registros', icon: HeartPulse, path: '/admin/clinico', color: '#003D5C' },
          { title: 'Gestão Comportamental', desc: 'Horas extras, ponto e solicitações', icon: TrendingUp, path: '/admin/comportamental', color: '#7C9DB5' },
          { title: 'Relatórios', desc: 'Gerar relatórios consolidados', icon: ClipboardList, path: '/admin/relatorios', color: '#8BABC7' },
        ].map((item, i) => (
          <motion.button
            key={item.title}
            {...card(0.5 + i * 0.1)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(item.path)}
            className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4 text-left hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
              <item.icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#003D5C] transition-colors">{item.title}</p>
              <p className="text-xs text-[#666666] mt-0.5">{item.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminDashboard;
