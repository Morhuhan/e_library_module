// src/components/BaseDialog.tsx
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BaseDialogProps } from '../utils/interfaces.tsx';

const BaseDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  title,
  children,
  widthClass = 'max-w-lg',
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount>
          {/* overlay */}
          <Dialog.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </Dialog.Overlay>

          {/* content */}
          <Dialog.Content asChild>
            <motion.div
              className={`fixed left-1/2 top-1/2 z-50 w-[92vw] ${widthClass} -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl flex flex-col`}
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.92, opacity: 0, y: '-50%', x: '-50%' }}
              animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%' }}
              exit={{ scale: 0.92, opacity: 0, y: '-50%', x: '-50%' }}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <Dialog.Title className="mb-4 text-lg font-semibold">{title}</Dialog.Title>

              {children}

              <Dialog.Close asChild>
                <button
                  className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);

export default BaseDialog;