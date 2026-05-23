import { ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  loading?: boolean;
  glow?: boolean;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-[#00D4FF] to-[#0090FF] text-[#040810] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]',
  success: 'bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-[#040810] hover:shadow-[0_0_30px_rgba(0,255,136,0.6)]',
  danger: 'bg-gradient-to-r from-[#FF6B35] to-[#FF2200] text-white hover:shadow-[0_0_30px_rgba(255,107,53,0.6)]',
  ghost: 'bg-transparent border border-[rgba(0,212,255,0.3)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)] hover:border-[#00D4FF]',
  gold: 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#040810] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)]',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-7 py-3.5 text-lg rounded-xl',
  xl: 'px-10 py-5 text-xl rounded-2xl',
};

export default function NeonButton({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  glow = false,
  className = '',
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={`
        font-bold tracking-wide transition-all duration-200 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${glow ? 'animate-pulse-glow' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          처리중...
        </span>
      ) : children}
    </button>
  );
}
