import { Switch } from "./ui/switch";

interface TopBarProps {
  imei: string;
  isActive: boolean;
  onToggle: (value: boolean) => void;
}

export function TopBar({ imei, isActive, onToggle }: TopBarProps) {
  return (
    <div className="bg-[#1e293b] px-5 pt-12 pb-5 flex justify-between items-center border-b border-[#334155] shadow-md">
      <div>
        <h1 className="text-white text-[24px] font-bold">GPS Tracker</h1>
        <p className="text-[#94a3b8] text-[12px] mt-1 font-mono">Device ID: {imei}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white text-[14px] font-semibold">
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}
