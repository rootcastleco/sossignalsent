interface StatusCardProps {
  status: 'Connected' | 'Sent' | 'Disconnected' | 'Connecting' | 'GPS Error' | 'Relay Error';
  server: string;
  relay: string;
  relayState: 'Offline' | 'Connecting' | 'Connected' | 'Error';
  interval: string;
}

export function StatusCard({ status, server, relay, relayState, interval }: StatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'Connected':
        return '#10b981'; // green
      case 'Sent':
        return '#fbbf24'; // yellow
      case 'Connecting':
        return '#3b82f6'; // blue
      case 'Relay Error':
        return '#f97316'; // orange
      default:
        return '#ef4444'; // red
    }
  };

  const getRelayColor = () => {
    switch (relayState) {
      case 'Connected':
        return '#10b981';
      case 'Connecting':
        return '#3b82f6';
      case 'Error':
        return '#ef4444';
      default:
        return '#94a3b8';
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[#94a3b8] text-[12px] mb-1 uppercase tracking-wide">TCP Server</p>
          <p className="text-white text-[14px] font-mono">{server}</p>
        </div>
        <div>
          <p className="text-[#94a3b8] text-[12px] mb-1 uppercase tracking-wide">Relay</p>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getRelayColor() }}
            ></span>
            <span className="text-white text-[14px] font-semibold">{relayState}</span>
          </div>
          <p className="text-[#94a3b8] text-[11px] mt-1 break-all font-mono">{relay}</p>
        </div>
        <div>
          <p className="text-[#94a3b8] text-[12px] mb-1 uppercase tracking-wide">Interval</p>
          <p className="text-white text-[14px] font-mono">{interval}</p>
        </div>
      </div>
    </div>
  );
}
