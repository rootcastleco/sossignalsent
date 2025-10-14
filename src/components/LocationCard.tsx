interface LocationCardProps {
  latitude: number;
  longitude: number;
}

export function LocationCard({ latitude, longitude }: LocationCardProps) {
  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-[#334155]">
      <h2 className="text-white text-[18px] font-semibold mb-3">Current Location</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f172a] rounded-xl p-4">
          <p className="text-[#94a3b8] text-[12px] mb-1">Latitude</p>
          <p className="text-white text-[20px] font-bold font-mono">
            {latitude.toFixed(5)}°
          </p>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-4">
          <p className="text-[#94a3b8] text-[12px] mb-1">Longitude</p>
          <p className="text-white text-[20px] font-bold font-mono">
            {longitude.toFixed(5)}°
          </p>
        </div>
      </div>
    </div>
  );
}
