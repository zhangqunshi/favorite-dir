import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = '搜索目录或文件...' }: Props) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 p-0.5 rounded-full hover:bg-border transition-colors"
        >
          <X className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      )}
    </div>
  );
}
