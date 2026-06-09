'use client';

import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useToastBus } from 'lib/useToastBus';
import styles from './ToastStack.module.scss';

export const ToastStack = () => {
  const items = useToastBus();
  return (
    <div className={styles.stack} aria-live="polite">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            className={clsx(styles.toast, styles[`v_${it.variant}`])}
            initial={{ opacity: 0, y: -10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            {it.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
