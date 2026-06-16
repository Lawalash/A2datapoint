import React from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {

  return (
    <>
      {/* Desktop header — visible only on lg+ (below sidebar) */}
      <header translate="no" className="notranslate hidden lg:flex h-16 bg-white border-b border-[#E5E5E5] items-center px-8 sticky top-0 w-full z-30">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl font-bold text-[#003D5C]"
        >
          {title}
        </motion.h1>
      </header>

      {/* Mobile sub-header (page title only — top bar handled by Sidebar) */}
      <div translate="no" className="notranslate lg:hidden bg-white border-b border-[#E5E5E5] px-4 py-3 fixed top-14 left-0 right-0 z-25">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-bold text-[#003D5C]"
        >
          {title}
        </motion.h1>
      </div>
    </>
  );
};

export default Header;
