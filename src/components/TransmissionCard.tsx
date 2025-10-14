interface TransmissionCardProps {
  data: string;
}

export function TransmissionCard({ data }: TransmissionCardProps) {
  if (!data) return null;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-[#334155]">
      <h2 className="text-white text-[18px] font-semibold mb-3">Last Transmission</h2>
      <div className="bg-[#0f172a] rounded-lg p-3">
        <p className="text-[#10b981] text-[10px] font-mono break-all leading-relaxed">
          {data}
        </p>
      </div>
    </div>
  );
}
