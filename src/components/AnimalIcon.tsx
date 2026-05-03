import React from 'react';

type Animal = 'dog' | 'cat' | 'rabbit';

interface Props {
  animal: Animal;
  size?: number;
  className?: string;
}

const animalSvgs: Record<Animal, React.ReactNode> = {
  dog: (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <ellipse cx="18" cy="30" rx="14" ry="20" fill="#f59e0b" transform="rotate(-20 18 30)" />
      <ellipse cx="18" cy="30" rx="8" ry="14" fill="#fcd34d" transform="rotate(-20 18 30)" />
      <ellipse cx="82" cy="30" rx="14" ry="20" fill="#f59e0b" transform="rotate(20 82 30)" />
      <ellipse cx="82" cy="30" rx="8" ry="14" fill="#fcd34d" transform="rotate(20 82 30)" />
      <circle cx="35" cy="45" r="5" fill="#1e293b" />
      <circle cx="37" cy="43" r="2" fill="white" />
      <circle cx="65" cy="45" r="5" fill="#1e293b" />
      <circle cx="67" cy="43" r="2" fill="white" />
      <ellipse cx="50" cy="58" rx="8" ry="6" fill="#1e293b" />
      <path d="M42 64 Q50 72 58 64" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="50" cy="70" rx="6" ry="8" fill="#f87171" />
      <ellipse cx="28" cy="55" rx="6" ry="4" fill="#fca5a5" opacity="0.6" />
      <ellipse cx="72" cy="55" rx="6" ry="4" fill="#fca5a5" opacity="0.6" />
    </svg>
  ),
  cat: (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="52" r="38" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <polygon points="18,30 30,5 42,28" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="22,26 30,12 38,26" fill="#fca5a5" />
      <polygon points="58,28 70,5 82,30" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="62,26 70,12 78,26" fill="#fca5a5" />
      <ellipse cx="35" cy="48" rx="8" ry="10" fill="#1e293b" />
      <ellipse cx="37" cy="45" rx="3" ry="4" fill="#fbbf24" />
      <circle cx="38" cy="44" r="1.5" fill="white" />
      <ellipse cx="65" cy="48" rx="8" ry="10" fill="#1e293b" />
      <ellipse cx="67" cy="45" rx="3" ry="4" fill="#fbbf24" />
      <circle cx="68" cy="44" r="1.5" fill="white" />
      <polygon points="46,58 54,58 50,64" fill="#fca5a5" />
      <path d="M50 64 Q44 70 40 66" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 64 Q56 70 60 66" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="55" x2="8" y2="50" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="22" y1="60" x2="8" y2="62" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="78" y1="55" x2="92" y2="50" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="78" y1="60" x2="92" y2="62" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <ellipse cx="25" cy="60" rx="6" ry="4" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="75" cy="60" rx="6" ry="4" fill="#fca5a5" opacity="0.5" />
    </svg>
  ),
  rabbit: (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="22" rx="10" ry="28" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" transform="rotate(-15 32 22)" />
      <ellipse cx="32" cy="22" rx="5" ry="20" fill="#fbcfe8" transform="rotate(-15 32 22)" />
      <ellipse cx="68" cy="22" rx="10" ry="28" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" transform="rotate(15 68 22)" />
      <ellipse cx="68" cy="22" rx="5" ry="20" fill="#fbcfe8" transform="rotate(15 68 22)" />
      <circle cx="50" cy="58" r="32" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" />
      <circle cx="38" cy="54" r="5" fill="#1e293b" />
      <circle cx="40" cy="52" r="2" fill="white" />
      <circle cx="62" cy="54" r="5" fill="#1e293b" />
      <circle cx="64" cy="52" r="2" fill="white" />
      <ellipse cx="50" cy="64" rx="5" ry="4" fill="#f9a8d4" />
      <path d="M50 68 Q45 74 40 70" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 68 Q55 74 60 70" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="46" y="68" width="4" height="5" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="50" y="68" width="4" height="5" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      <ellipse cx="30" cy="62" rx="6" ry="4" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="70" cy="62" rx="6" ry="4" fill="#fca5a5" opacity="0.5" />
      <polygon points="42,84 50,88 58,84 50,80" fill="#f472b6" />
      <polygon points="38,82 46,86 46,78" fill="#ec4899" />
      <polygon points="62,82 54,86 54,78" fill="#ec4899" />
    </svg>
  ),
};

export default function AnimalIcon({ animal, size = 64, className = '' }: Props) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      {animalSvgs[animal]}
    </div>
  );
}
