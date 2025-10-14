interface TransmissionCardProps {
  outbound: string;
  inbound: string;
}

export function TransmissionCard({ outbound, inbound }: TransmissionCardProps) {
  if (!outbound && !inbound) return null;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-[#334155] space-y-3">
      <h2 className="text-white text-[18px] font-semibold">Transmission Log</h2>
      {outbound && (
        <div>
          <p className="text-[#94a3b8] text-[12px] font-semibold uppercase tracking-wide mb-1">Last Outbound</p>
          <div className="bg-[#0f172a] rounded-lg p-3">
            <p className="text-[#10b981] text-[10px] font-mono break-all leading-relaxed">
              {outbound}
            </p>
          </div>
        </div>
      )}
      {inbound && (
        <div>
          <p className="text-[#94a3b8] text-[12px] font-semibold uppercase tracking-wide mb-1">Last Response</p>
          <div className="bg-[#0f172a] rounded-lg p-3">
            <p className="text-[#38bdf8] text-[10px] font-mono break-all leading-relaxed">
              {inbound}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
