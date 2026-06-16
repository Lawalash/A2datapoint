import React from 'react';
import { Calendar, Clock, Moon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayOffCardProps {
  nextWorkDate: { date: string; time: string; crossesMidnight: boolean } | null;
}

export const DayOffCard: React.FC<DayOffCardProps> = ({ nextWorkDate }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] mb-6 text-center border-2 border-[#E5E5E5]/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8FAFC] rounded-full translate-x-16 -translate-y-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F8FAFC] rounded-full -translate-x-12 translate-y-12" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-[#E5E5E5]/50">
          <Calendar className="w-8 h-8 text-[#A0A0A0]" />
        </div>
        
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Hoje é seu dia de folga</h3>
        <p className="text-sm text-[#666666] mb-6">
          Não há expediente previsto para hoje nesta escala.
        </p>

        {nextWorkDate ? (
          <div className="w-full bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E5E5]/50 flex flex-col items-center">
            <p className="text-xs font-semibold text-[#003D5C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> 
              {nextWorkDate.crossesMidnight ? 'Próximo Plantão' : 'Próximo Expediente'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[#1A1A1A]">
              <span className="font-bold text-lg">
                {format(parseISO(nextWorkDate.date), "dd 'de' MMMM", { locale: ptBR })}
              </span>
              <span className="hidden sm:block text-[#C8D8E4]">•</span>
              {nextWorkDate.crossesMidnight ? (
                <span className="font-bold text-lg flex items-center gap-1.5 bg-[#6F42C1]/10 text-[#6F42C1] px-3 py-1 rounded-full text-sm">
                  <Moon className="w-4 h-4" /> das {nextWorkDate.time} às 07:00
                </span>
              ) : (
                <span className="font-bold text-lg bg-[#E8F0F5] text-[#003D5C] px-3 py-1 rounded-full text-sm">
                  às {nextWorkDate.time}
                </span>
              )}
            </div>
            {nextWorkDate.crossesMidnight && (
              <p className="text-xs text-[#666666] mt-2 italic">(cruza a meia-noite para o dia seguinte)</p>
            )}
          </div>
        ) : (
          <div className="w-full bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E5E5]/50">
            <p className="text-sm font-medium text-[#666666]">
              Consulte seu gestor para saber seu próximo dia de trabalho.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
