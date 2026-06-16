import React from 'react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { mockClinicalRecords, riskColorMap } from '@/data/mockData';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const HeadNurseRegistros: React.FC = () => {
  const { addToast } = useToast();

  return (
    <AuthenticatedLayout requiredRole="Enfermeira Chefe" pageTitle="Registros Recentes">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#003D5C]">
            Todos os Registros Clínicos
            <span className="ml-2 bg-[#003D5C] text-white text-xs px-2 py-0.5 rounded-full">
              {mockClinicalRecords.length}
            </span>
          </h3>
          <button
            onClick={() => addToast('Dados atualizados!', 'success')}
            className="p-2 text-[#8BABC7] hover:text-[#003D5C] hover:bg-[#F8F9FA] rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Data/Hora</th>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Responsável</th>
                <th className="text-left px-4 py-3">PA</th>
                <th className="text-left px-4 py-3">HGT</th>
                <th className="text-left px-4 py-3">FC</th>
                <th className="text-left px-4 py-3">FR</th>
                <th className="text-left px-4 py-3">SpO2</th>
                <th className="text-left px-4 py-3">Temp</th>
                <th className="text-left px-4 py-3">Risco</th>
                <th className="text-left px-4 py-3">Evolução</th>
              </tr>
            </thead>
            <tbody>
              {mockClinicalRecords.map(record => {
                const riskColors = riskColorMap[record.risk] || riskColorMap['Não Urgente'];
                const isPriority = record.risk === 'Urgente' || record.risk === 'Muito Urgente' || record.risk === 'Emergência';
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`border-b border-[#F0F0F0] hover:bg-[#F8FAFC] transition-colors ${
                      isPriority ? 'border-l-[3px]' : ''
                    }`}
                    style={isPriority ? { borderLeftColor: riskColors.bg.replace('bg-[', '').replace(']', '') } : {}}
                  >
                    <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{record.dateTime}</td>
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">{record.patientName}</td>
                    <td className="px-4 py-3 text-[#666666]">{record.nurseName}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.pa}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.hgt}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.fc}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.fr}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.spo2}%</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.temp}°C</td>
                    <td className="px-4 py-3">
                      <span className={`${riskColors.bg} ${riskColors.text} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap`}>
                        {record.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#666666] max-w-[200px] truncate">{record.observations}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AuthenticatedLayout>
  );
};

export default HeadNurseRegistros;
