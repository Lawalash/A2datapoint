import React from 'react';
import { motion } from 'framer-motion';

const riskLevels = [
  { label: 'Não Urgente', color: '#28A745' },
  { label: 'Pouco Urgente', color: '#6C757D' },
  { label: 'Urgente', color: '#F0AD4E' },
  { label: 'Muito Urgente', color: '#DC3545' },
  { label: 'Emergência', color: '#8B0000' },
];

interface RiskSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

const RiskSelector: React.FC<RiskSelectorProps> = ({ selected, onChange }) => {
  return (
    <div className="flex flex-wrap gap-3">
      {riskLevels.map(level => {
        const isSelected = selected === level.label;
        return (
          <motion.button
            key={level.label}
            type="button"
            whileTap={{ scale: 0.95 }}
            animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
            onClick={() => onChange(level.label)}
            className="flex-1 min-w-[140px] rounded-full min-h-[48px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: isSelected ? level.color : '#FFFFFF',
              color: isSelected ? '#FFFFFF' : level.color,
              border: `2px solid ${level.color}`,
              boxShadow: isSelected ? `0 4px 12px ${level.color}40` : 'none',
            }}
          >
            {level.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default RiskSelector;
