interface StatusCardProps {
  status: 'Connected' | 'Sent' | 'Disconnected' | 'Connecting' | 'GPS Error';
  server: string;
  interval: string;
}

export function StatusCard({ status, server, interval }: StatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'Connected':
        return '#10b981'; // green
      case 'Sent':
        return '#fbbf24'; // yellow
      case 'Connecting':
        return '#3b82f6'; // blue
      default:
        return '#ef4444'; // red
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-[#334155]">
      <h2 className="text-white text-[18px] font-semibold mb-3">Connection Status</h2>
      <p 
        className="text-[24px] font-bold mb-4"
        style={{ color: getStatusColor() }}
      >
        {status}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[#94a3b8] text-[12px] mb-1">Server</p>
          <p className="text-white text-[14px] font-mono">{server}</p>
        </div>
        <div>
          <p className="text-[#94a3b8] text-[12px] mb-1">Interval</p>
          <p className="text-white text-[14px] font-mono">{interval}</p>
        </div>
      </div>
    </div>
  );
}
