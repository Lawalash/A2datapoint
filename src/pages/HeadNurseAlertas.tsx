import React from 'react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { mockClinicalRecords, riskColorMap } from '@/data/mockData';
import { AlertTriangle } from 'lucide-react';

const HeadNurseAlertas: React.FC = () => {
  const alertRecords = mockClinicalRecords.filter(
    r => r.risk === 'Urgente' || r.risk === 'Muito Urgente' || r.risk === 'Emergência'
  );

  return (
    <AuthenticatedLayout requiredRole="Enfermeira Chefe" pageTitle="Alertas de Risco">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#DC3545]/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-[#DC3545]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#003D5C]">Pacientes com Alerta</h3>
          <p className="text-xs text-[#666666]">{alertRecords.length} registros com risco elevado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertRecords.map((record, index) => {
          const riskColors = riskColorMap[record.risk] || riskColorMap['Urgente'];
          const borderColor = riskColors.bg.replace('bg-[', '').replace(']', '');

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-5 border-l-4"
              style={{ borderLeftColor: borderColor }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">{record.patientName}</h4>
                  <p className="text-xs text-[#666666]">{record.dateTime} — {record.nurseName}</p>
                </div>
                <span className={`${riskColors.bg} ${riskColors.text} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap`}>
                  {record.risk}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#F8F9FA] rounded-lg p-2 text-center">
                  <p className="text-xs text-[#666666]">PA</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{record.pa}</p>
                </div>
                <div className="bg-[#F8F9FA] rounded-lg p-2 text-center">
                  <p className="text-xs text-[#666666]">FC</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{record.fc} bpm</p>
                </div>
                <div className="bg-[#F8F9FA] rounded-lg p-2 text-center">
                  <p className="text-xs text-[#666666]">SpO2</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{record.spo2}%</p>
                </div>
              </div>

              <div className="border-t border-[#E5E5E5] pt-3">
                <p className="text-xs text-[#666666]">
                  <span className="font-medium text-[#003D5C]">Sintomas: </span>
                  {record.symptoms.join(', ')}
                </p>
                <p className="text-xs text-[#666666] mt-1">
                  <span className="font-medium text-[#003D5C]">Observações: </span>
                  {record.observations}
                </p>
              </div>
            </motion.div>
          );
        })}

        {alertRecords.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-2 bg-white rounded-2xl shadow-sm p-8 text-center"
          >
            <p className="text-[#666666]">Nenhum alerta de risco ativo no momento.</p>
          </motion.div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default HeadNurseAlertas;
