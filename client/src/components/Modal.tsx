import React, { ReactNode } from 'react';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const contentStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '1rem',
  borderRadius: '6px',
  width: '400px',
  maxWidth: '90%',
};

const Modal: React.FC<ModalProps> = ({ visible, onClose, children }) => {
  if (!visible) return null;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default Modal;