import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ChipSelectorProps {
  options: string[];
  selected: string | string[];
  onChange: (value: any) => void;
  multiSelect?: boolean;
  colorMap?: Record<string, { bg: string; text: string; border: string }>;
  exclusiveOption?: string;
}

const ChipSelector: React.FC<ChipSelectorProps> = ({
  options,
  selected,
  onChange,
  multiSelect = false,
  colorMap,
  exclusiveOption = 'Nenhum',
}) => {
  const isSelected = (option: string) => {
    if (multiSelect) return (selected as string[]).includes(option);
    return selected === option;
  };

  const handleClick = (option: string) => {
    if (multiSelect) {
      const current = selected as string[];
      if (option === exclusiveOption) {
        onChange([option]);
        return;
      }
      if (current.includes(option)) {
        const next = current.filter(v => v !== option);
        onChange(next.length === 0 ? [exclusiveOption] : next);
      } else {
        const next = current.filter(v => v !== exclusiveOption);
        onChange([...next, option]);
      }
    } else {
      onChange(option);
    }
  };

  const getColors = (option: string) => {
    const selected_value = isSelected(option);
    if (colorMap && colorMap[option]) {
      const colors = colorMap[option];
      if (selected_value) {
        return { bg: colors.bg, text: colors.text, border: colors.border };
      }
      return { bg: 'bg-white', text: colors.text.replace('text-white', 'text-current').replace('text-', 'text-') || 'text-[#1A1A1A]', border: colors.border };
    }
    if (selected_value) {
      return { bg: 'bg-[#003D5C]', text: 'text-white', border: 'border-[#003D5C]' };
    }
    return { bg: 'bg-white', text: 'text-[#1A1A1A]', border: 'border-[#E5E5E5]' };
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const colors = getColors(option);
        const sel = isSelected(option);
        return (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(option)}
            className={`${colors.bg} ${colors.text} border-[1.5px] ${colors.border} rounded-full px-5 py-2.5 min-h-[44px] text-sm font-medium cursor-pointer transition-all duration-150 flex items-center gap-1.5 hover:border-[#8BABC7]`}
          >
            {multiSelect && sel && <Check className="w-3.5 h-3.5" />}
            {option}
          </motion.button>
        );
      })}
    </div>
  );
};

export default ChipSelector;
