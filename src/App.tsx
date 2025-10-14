import { useState, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { StatusCard } from './components/StatusCard';
import { LocationCard } from './components/LocationCard';
import { SOSButton } from './components/SOSButton';
import { TransmissionCard } from './components/TransmissionCard';

type StatusType = 'Connected' | 'Sent' | 'Disconnected' | 'Connecting' | 'GPS Error';

// Format GPRMC message
const formatGPRMC = (lat: number, lng: number, deviceId: string, alert = 'NORM') => {
  const now = new Date();
  const hhmmss = [now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()]
    .map(n => String(n).padStart(2, '0')).join('') + '.000';
  const ddmmyy = String(now.getUTCDate()).padStart(2, '0')
    + String(now.getUTCMonth() + 1).padStart(2, '0')
    + String(now.getUTCFullYear()).slice(-2);

  const toNmea = (val: number, isLat: boolean) => {
    const deg = Math.floor(Math.abs(val));
    const min = ((Math.abs(val) - deg) * 60).toFixed(4);
    const dd = String(deg).padStart(isLat ? 2 : 3, '0');
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return { dm: `${dd}${min}`, dir };
  };

  const L = toNmea(lat, true);
  const G = toNmea(lng, false);
  const trackId = '14345';

  return `$GPRMC,${hhmmss},A,${L.dm},${L.dir},${G.dm},${G.dir},0,0,${ddmmyy},0,0,0,${trackId},${alert},${deviceId}#`;
};

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<StatusType>('Disconnected');
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [lastTransmission, setLastTransmission] = useState('');
  const [locationError, setLocationError] = useState('');
  const [permissionState, setPermissionState] = useState<string>('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const DEVICE_ID = '4659060906808';
  const SERVER = 'http://179.60.177.14:6002';
  const INTERVAL = '5 seconds';

  const markSent = () => {
    setStatus('Sent');
    setTimeout(() => {
      if (isActiveRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        setStatus('Connected');
      }
    }, 800);
  };

  const flushQueue = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (messageQueueRef.current.length > 0) {
      const queued = messageQueueRef.current.shift();
      if (queued) {
        ws.send(queued);
        markSent();
      }
    }
  };

  const ensureSocketConnection = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    connectPromiseRef.current = new Promise<void>((resolve, reject) => {
      setStatus('Connecting');

      try {
        const ws = new WebSocket(SOCKET_URL);
        wsRef.current = ws;
        let settled = false;

        ws.onopen = () => {
          settled = true;
          setStatus('Connected');
          flushQueue();
          resolve();
          connectPromiseRef.current = null;
        };

        ws.onerror = (event) => {
          console.error('WebSocket error', event);
          if (!settled) {
            settled = true;
            reject(new Error('WebSocket connection error'));
          }
          setStatus('Disconnected');
          connectPromiseRef.current = null;
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!settled) {
            settled = true;
            reject(new Error('WebSocket connection closed before opening'));
          }
          setStatus('Disconnected');
          connectPromiseRef.current = null;
        };
      } catch (error) {
        console.error('Failed to create WebSocket', error);
        connectPromiseRef.current = null;
        reject(error as Error);
      }
    });

    return connectPromiseRef.current;
  };

  // Check permission status on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionState(result.state);
        result.addEventListener('change', () => {
          setPermissionState(result.state);
        });
      }).catch(() => {
        setPermissionState('unknown');
      });
    }
  }, []);

  // Request location permission manually
  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support geolocation');
      setStatus('GPS Error');
      return false;
    }

    setIsRequestingPermission(true);
    setLocationError('');

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsRequestingPermission(false);
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          setLocationError('');
          setPermissionState('granted');
          resolve(true);
        },
        (error) => {
          setIsRequestingPermission(false);
          let errorMsg = 'Unknown error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out';
              break;
          }
          
          setLocationError(errorMsg);
          setStatus('GPS Error');
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      );
    });
  };

  // Request location permission and start watching GPS
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support geolocation');
      setStatus('GPS Error');
      return;
    }

    // First request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    setStatus('Connecting');
    setLocationError('');

    // Watch position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setStatus('Connected');
        setLocationError('');

        // Send location data
        const message = formatGPRMC(latitude, longitude, DEVICE_ID, 'NORM');
        sendData(message);
      },
      (error) => {
        let errorMsg = 'Unknown error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timed out';
            break;
        }
        setLocationError(errorMsg);
        setStatus('GPS Error');
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000
      }
    );
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    messageQueueRef.current = [];
    connectPromiseRef.current = null;
  };

  // Send data to the configured server endpoint
  const sendData = async (message: string) => {
    setLastTransmission(message);
    setStatus('Connecting');

    try {
      await fetch(SERVER, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: message,
        mode: 'no-cors',
      });

      setStatus('Sent');

      setTimeout(() => {
        if (isActive) setStatus('Connected');
      }, 800);
    } catch (error) {
      console.error('Failed to send SOS message', error);
      setStatus('Disconnected');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleToggle = async (value: boolean) => {
    if (value) {
      setIsActive(true);
      await startLocationTracking();
      // If tracking failed, turn off the switch
      if (locationError) {
        setIsActive(false);
      }
    } else {
      setIsActive(false);
      stopLocationTracking();
      setStatus('Disconnected');
      setLocationError('');
    }
  };

  const handleSOS = () => {
    if (!isActive) {
      alert('Please activate tracking first');
      return;
    }

    if (location.latitude === 0 && location.longitude === 0) {
      alert('Waiting for GPS location...');
      return;
    }
    
    const confirmed = window.confirm('Send emergency alert?');
    if (confirmed) {
      // Get current position for SOS
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const message = formatGPRMC(latitude, longitude, DEVICE_ID, 'SOS');
          sendData(message);
          alert('🚨 SOS signal sent!');
        },
        () => {
          // Use last known position if current fails
          const message = formatGPRMC(location.latitude, location.longitude, DEVICE_ID, 'SOS');
          sendData(message);
          alert('🚨 SOS signal sent with last known location!');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Pixel 6 Frame */}
      <div className="relative w-full max-w-[412px] h-[915px] bg-black rounded-[40px] shadow-2xl overflow-hidden border-8 border-gray-900">
        {/* Screen */}
        <div className="w-full h-full bg-[#0f172a] overflow-y-auto">
          <TopBar 
            imei={DEVICE_ID}
            isActive={isActive}
            onToggle={handleToggle}
          />
          
          <div className="p-5 space-y-5">
            {locationError && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444] rounded-2xl p-4">
                <p className="text-[#ef4444] text-[14px] font-semibold">⚠️ {locationError}</p>
                <div className="mt-3 space-y-2">
                  <p className="text-[#94a3b8] text-[12px] font-semibold">
                    How to grant location permission:
                  </p>
                  <div className="text-[#94a3b8] text-[11px] space-y-1">
                    <p><strong>Chrome/Edge:</strong></p>
                    <p>1. Click the 🔒 lock icon in the address bar</p>
                    <p>2. Set "Location" permission to "Allow"</p>
                    <p>3. Refresh the page and try again</p>
                    <p className="mt-2"><strong>Firefox:</strong></p>
                    <p>1. Click the 🛈 icon in the address bar</p>
                    <p>2. Find "Permissions" → "Access Your Location"</p>
                    <p>3. Select "Allow" and refresh</p>
                  </div>
                  <button
                    onClick={() => requestLocationPermission()}
                    className="mt-3 w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg py-2 text-[12px] font-semibold transition-colors"
                    disabled={isRequestingPermission}
                  >
                    {isRequestingPermission ? 'Requesting Permission...' : '🔄 Request Permission Again'}
                  </button>
                </div>
              </div>
            )}

            {permissionState === 'denied' && !locationError && (
              <div className="bg-[#fbbf24]/10 border border-[#fbbf24] rounded-2xl p-4">
                <p className="text-[#fbbf24] text-[14px] font-semibold">🔐 Location Permission Required</p>
                <p className="text-[#94a3b8] text-[11px] mt-2">
                  GPS tracking requires browser location access. Follow the steps above to grant permission.
                </p>
              </div>
            )}

            {!isActive && !locationError && permissionState !== 'denied' && (
              <div className="bg-[#3b82f6]/10 border border-[#3b82f6] rounded-2xl p-4">
                <p className="text-[#3b82f6] text-[14px] font-semibold">📍 Ready to Track</p>
                <p className="text-[#94a3b8] text-[11px] mt-2">
                  Toggle the switch above to "Active" to start GPS tracking. You'll be prompted to allow location access.
                </p>
              </div>
            )}
            
            <StatusCard 
              status={status}
              server={SERVER}
              interval={INTERVAL}
            />
            
            <LocationCard 
              latitude={location.latitude}
              longitude={location.longitude}
            />
            
            <SOSButton 
              disabled={!isActive}
              onClick={handleSOS}
            />
            
            <TransmissionCard data={lastTransmission} />
          </div>
        </div>

        {/* Pixel 6 Camera Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl"></div>
      </div>

      {/* Developer Handoff - Color Palette */}
      <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-md rounded-lg p-4 text-white text-xs space-y-2 max-w-[250px] hidden lg:block">
        <h3 className="font-bold mb-2">Color Palette</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#0f172a] border border-white/20"></div>
            <span>#0f172a - Background</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#1e293b] border border-white/20"></div>
            <span>#1e293b - Cards</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#334155] border border-white/20"></div>
            <span>#334155 - Borders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#94a3b8] border border-white/20"></div>
            <span>#94a3b8 - Labels</span>
          </div>
        </div>
        <h3 className="font-bold mt-3 mb-2">Components</h3>
        <ul className="space-y-1 text-[11px]">
          <li>• TopBar</li>
          <li>• StatusCard</li>
          <li>• LocationCard</li>
          <li>• SOSButton</li>
          <li>• TransmissionCard</li>
        </ul>
      </div>
    </div>
  );
}
