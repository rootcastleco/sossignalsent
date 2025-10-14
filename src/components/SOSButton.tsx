interface SOSButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function SOSButton({ disabled, onClick }: SOSButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full h-[70px] rounded-2xl flex items-center justify-center
        transition-all duration-200
        ${disabled 
          ? 'bg-[#64748b] opacity-50 cursor-not-allowed' 
          : 'bg-[#ef4444] hover:bg-[#dc2626] active:scale-95'
        }
      `}
    >
      <span className="text-white text-[24px] font-bold">
        🚨 EMERGENCY SOS
      </span>
    </button>
  );
}
