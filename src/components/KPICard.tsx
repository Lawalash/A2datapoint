import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  delay?: number;
  trend?: number;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon: Icon, color, delay = 0, trend }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[#666666] font-medium uppercase tracking-wide">{label}</p>
        <div className="mt-1 flex items-end justify-between">
          <div>
            <p className="text-[32px] font-bold leading-tight" style={{ color }}>
              {value}
            </p>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[13px] font-semibold ${trend >= 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KPICard;
