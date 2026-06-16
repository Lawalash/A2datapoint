import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Clock, Calendar, Timer, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataPointMock } from '@/context/DataPointMockContext';
import type { UserRole } from '@/types';

interface MeuPontoProps {
  requiredRole: UserRole;
  pageTitle: string;
}

const MeuPonto: React.FC<MeuPontoProps> = ({ requiredRole, pageTitle }) => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const { getEmployeeAttendanceHistory, getEmployeeHourBalance, requests } = useDataPointMock();
  const [dayStatus] = useState<'Em serviço' | 'Almoço' | 'Saiu'>('Em serviço');

  const myHistory = user ? getEmployeeAttendanceHistory(user.id) : [];
  const myBalance = user ? getEmployeeHourBalance(user.id) : 0;
  const myRequests = user ? requests.filter(r => r.employeeId === user.id) : [];
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = myHistory.find(r => r.date === todayStr);

  const statusColors = {
    'Em serviço': 'bg-[#28A745]/15 text-[#28A745]',
    'Almoço': 'bg-[#F0AD4E]/15 text-[#F0AD4E]',
    'Saiu': 'bg-[#DC3545]/15 text-[#DC3545]',
  };

  const attendanceStatusColors = {
    'Normal': 'bg-[#28A745]',
    'Atraso': 'bg-[#F0AD4E]',
    'Falta': 'bg-[#DC3545]',
  };

  const requestStatusColors = {
    'Pendente': 'bg-[#F0AD4E]/15 text-[#F0AD4E]',
    'Aprovada': 'bg-[#28A745]/15 text-[#28A745]',
    'Reprovada': 'bg-[#DC3545]/15 text-[#DC3545]',
  };

  return (
    <AuthenticatedLayout requiredRole={requiredRole} pageTitle={pageTitle}>
      <div className="space-y-6">
        {/* Day Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#003D5C]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#003D5C]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#003D5C]">Resumo do Dia</h3>
              <span className={`${statusColors[dayStatus]} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                {dayStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
              <p className="text-xs text-[#666666] mb-1">Entrada</p>
              <p className="text-xl font-bold text-[#003D5C]">{todayRecord?.entry || '--:--'}</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
              <p className="text-xs text-[#666666] mb-1">Saída</p>
              <p className="text-xl font-bold text-[#003D5C]">{todayRecord?.exit || '--:--'}</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
              <p className="text-xs text-[#666666] mb-1">Almoço</p>
              <p className="text-xl font-bold text-[#7C9DB5]">{todayRecord?.breakTime || '--'}</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
              <p className="text-xs text-[#666666] mb-1">Total</p>
              <p className="text-xl font-bold text-[#28A745]">{todayRecord?.total || '--'}</p>
            </div>
          </div>
        </motion.div>

        {/* Weekly History Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-[#003D5C]" />
            <h3 className="text-base font-semibold text-[#003D5C]">Histórico da Semana</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Entrada</th>
                  <th className="text-left px-4 py-3">Alm. Saída</th>
                  <th className="text-left px-4 py-3">Alm. Retorno</th>
                  <th className="text-left px-4 py-3">Saída</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.map((day, i) => {
                  const outLunch = day.punches.find(p => p.type === 'SAIDA_ALMOCO')?.time || '--:--';
                  const retLunch = day.punches.find(p => p.type === 'RETORNO_ALMOCO')?.time || '--:--';
                  return (
                  <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#1A1A1A] font-medium">{day.date}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{day.entry || '--:--'}</td>
                    <td className="px-4 py-3 text-[#666666]">{outLunch}</td>
                    <td className="px-4 py-3 text-[#666666]">{retLunch}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{day.exit || '--:--'}</td>
                    <td className="px-4 py-3 text-[#1A1A1A] font-medium">{day.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${attendanceStatusColors[day.status]}`} />
                        <span className="text-[#1A1A1A]">{day.status}</span>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Bank of Hours Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#28A745]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#28A745]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#003D5C]">Banco de Horas</h3>
              <p className="text-xs text-[#666666]">Saldo acumulado</p>
            </div>
          </div>

          <div className="bg-[#F8F9FA] rounded-xl p-5 text-center mb-5">
            <p className={`text-4xl font-bold ${myBalance >= 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>{myBalance >= 0 ? '+' : '-'}{Math.floor(Math.abs(myBalance) / 60)}h{Math.abs(myBalance) % 60}m</p>
            <p className="text-sm text-[#666666] mt-1">horas de saldo acumulado</p>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => addToast('Solicitação de compensação enviada!', 'info')}
              className="flex-1 h-11 bg-[#7C9DB5] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Solicitar Compensação
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => addToast('Solicitação de hora extra enviada!', 'info')}
              className="flex-1 h-11 bg-[#8BABC7] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <Timer className="w-4 h-4" />
              Solicitar Hora Extra
            </motion.button>
          </div>
        </motion.div>

        {/* Overtime Request History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <h3 className="text-base font-semibold text-[#003D5C] mb-4">
            Histórico de Solicitações
            <span className="ml-2 bg-[#003D5C] text-white text-xs px-2 py-0.5 rounded-full">
              {myRequests.length}
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Horas</th>
                  <th className="text-left px-4 py-3">Justificativa</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(req => (
                  <tr key={req.id} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#1A1A1A]">{req.date}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{req.type}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{req.hours}h</td>
                    <td className="px-4 py-3 text-[#666666]">{req.justification}</td>
                    <td className="px-4 py-3">
                      <span className={`${requestStatusColors[req.status as keyof typeof requestStatusColors]} text-xs font-semibold px-3 py-1 rounded-full`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AuthenticatedLayout>
  );
};

export default MeuPonto;
