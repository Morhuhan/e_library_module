// src/components/AuthorChip.tsx
import { X } from 'lucide-react';
import { AuthorChipProps } from '../utils/interfaces.tsx';

const AuthorChip: React.FC<AuthorChipProps> = ({ name, onRemove }) => (
  <span className="flex items-center gap-1 rounded-2xl bg-gray-200 px-3 py-0.5 text-sm">
    {name}
    <button
      type="button"
      onClick={onRemove}
      className="hover:text-red-600 focus:outline-none"
      aria-label={`Удалить ${name}`}
    >
      <X size={14} />
    </button>
  </span>
);

export default AuthorChip;