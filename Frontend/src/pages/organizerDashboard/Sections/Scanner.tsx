import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

// Mock ticket redemption function - replace with actual API call
const redeemTicket = async (ticketId: string, nonce: string) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock success/failure logic
  const isSuccess = Math.random() > 0.3; // 70% success rate
  
  if (isSuccess) {
    return { success: true, message: "Ticket redeemed successfully" };
  } else {
    return { success: false, message: "Ticket already used or invalid" };
  }
};

// Types for scan history
interface ScanRecord {
  id: string;
  ticketId: string;
  eventName: string;
  timestamp: Date;
  status: 'success' | 'failed';
  message: string;
  scanMethod: 'qr' | 'manual';
}

// Helper component for status feedback icons
const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'success') return <span className="text-5xl">✅</span>;
  if (status === 'failed') return <span className="text-5xl">❌</span>;
  if (status === 'validating') return <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>;
  return null;
};

// History item component
const HistoryItem = ({ record }: { record: ScanRecord }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${
      record.status === 'success' 
        ? 'bg-green-50 border-green-500' 
        : 'bg-red-50 border-red-500'
    } mb-3 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              record.status === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {record.status === 'success' ? '✅ Admitted' : '❌ Denied'}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {record.scanMethod === 'qr' ? 'QR Scan' : 'Manual Entry'}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 text-sm mb-1">
            {record.eventName}
          </h4>
          <p className="text-xs text-gray-600 mb-2 font-mono">
            ID: {record.ticketId}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">
            {record.message}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div className="font-medium">{formatTime(record.timestamp)}</div>
          <div>{formatDate(record.timestamp)}</div>
        </div>
      </div>
    </div>
  );
};

// Stats component
const StatsCard = ({ title, value, icon, color }: { 
  title: string; 
  value: number; 
  icon: string; 
  color: string; 
}) => (
  <div className={`bg-white rounded-lg p-4 border border-gray-200 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </div>
);

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState("idle");
  const [scanMessage, setScanMessage] = useState("Point camera at a QR code");
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [eventName, setEventName] = useState("Tech Conference 2024"); // Mock event name

  // Calculate stats
  const totalScans = scanHistory.length;
  const successfulScans = scanHistory.filter(record => record.status === 'success').length;
  const failedScans = scanHistory.filter(record => record.status === 'failed').length;
  const qrScans = scanHistory.filter(record => record.scanMethod === 'qr').length;
  const manualScans = scanHistory.filter(record => record.scanMethod === 'manual').length;

  useEffect(() => {
    if (videoRef.current && !scannerRef.current) {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          onDecodeError: () => {},
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current = scanner;
      
      scanner.start().then(() => {
        setStatus("scanning");
      }).catch(err => {
        setStatus("failed");
        setScanMessage("Could not start camera. Please grant permission.");
        console.error(err);
      });
    }

    return () => {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const addToHistory = (record: Omit<ScanRecord, 'id' | 'timestamp'>) => {
    const newRecord: ScanRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setScanHistory(prev => [newRecord, ...prev.slice(0, 49)]); // Keep last 50 records
  };

  const processTicketRedemption = async (ticketId: string, nonce: string, scanMethod: 'qr' | 'manual') => {
    if (status === 'validating' || status === 'success' || status === 'failed') {
      return;
    }

    scannerRef.current?.stop();
    setStatus("validating");
    setScanMessage("Validating ticket...");

    try {
      if (!ticketId) {
        throw new Error("Invalid ticket format. Missing Ticket ID.");
      }

      const result = await redeemTicket(ticketId, nonce);
      
      if (result.success) {
        setStatus("success");
        setScanMessage("ADMITTED: Ticket redeemed successfully!");
        addToHistory({
          ticketId,
          eventName,
          status: 'success',
          message: result.message,
          scanMethod
        });
      } else {
        throw new Error(result.message || "Redemption failed.");
      }
    } catch (error) {
      setStatus("failed");
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setScanMessage(`DENIED: ${errorMessage}`);
      addToHistory({
        ticketId,
        eventName,
        status: 'failed',
        message: errorMessage,
        scanMethod
      });
    } finally {
      setTimeout(() => {
        setStatus("scanning");
        setScanMessage("Ready for next scan...");
        if (videoRef.current) {
          scannerRef.current?.start();
        }
      }, 3000);
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      const url = new URL(qrData);
      const ticketId = url.searchParams.get("ticketId");
      const nonce = url.searchParams.get("nonce");
      await processTicketRedemption(ticketId || "", nonce || "manual_redeem", 'qr');
    } catch (e) {
      setStatus("failed");
      setScanMessage("DENIED: Invalid QR code.");
      addToHistory({
        ticketId: "Invalid QR",
        eventName,
        status: 'failed',
        message: "Invalid QR code format",
        scanMethod: 'qr'
      });
      setTimeout(() => {
        setStatus("scanning");
        setScanMessage("Ready for next scan...");
        if (videoRef.current) {
          scannerRef.current?.start();
        }
      }, 3000);
    }
  };

  const handleManualRedeem = async () => {
    if (!ticketIdInput) {
      setScanMessage("Please enter a Ticket ID.");
      return;
    }
    await processTicketRedemption(ticketIdInput, "manual_redeem", 'manual');
  };

  const getStatusColor = () => {
    if (status === 'success') return 'bg-green-500/90';
    if (status === 'failed') return 'bg-red-500/90';
    if (status === 'validating') return 'bg-blue-500/90';
    return 'opacity-0';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Scanner</h1>
          <p className="text-lg text-gray-600">Scan QR codes or manually enter ticket IDs</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
                <span className="text-blue-600">📱</span>
                Ticket Scanner
              </h2>
              
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-white font-bold transition-opacity duration-300 pointer-events-none ${getStatusColor()}`}>
                  <StatusIcon status={status} />
                  {status !== 'scanning' && status !== 'idle' && (
                    <p className="mt-4 text-xl text-center max-w-sm">{scanMessage}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-lg font-medium h-6 text-center text-gray-700">
                {status === 'scanning' && scanMessage}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="text-gray-600">⌨️</span>
                  Manual Entry
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={ticketIdInput}
                    onChange={(e) => setTicketIdInput(e.target.value)}
                    placeholder="Enter Ticket ID" 
                    className="flex-grow p-4 border border-gray-300 bg-gray-50 rounded-lg text-center text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200" 
                  />
                  <button 
                    onClick={handleManualRedeem}
                    disabled={status === 'validating'}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    Admit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
                <span className="text-green-600">📊</span>
                Scan History
              </h2>

              {/* Event Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">{eventName}</h3>
                <p className="text-sm text-gray-600">Active scanning session</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatsCard 
                  title="Total Scans" 
                  value={totalScans} 
                  icon="📈" 
                  color="hover:bg-blue-50 transition-colors"
                />
                <StatsCard 
                  title="Successful" 
                  value={successfulScans} 
                  icon="✅" 
                  color="hover:bg-green-50 transition-colors"
                />
                <StatsCard 
                  title="Failed" 
                  value={failedScans} 
                  icon="❌" 
                  color="hover:bg-red-50 transition-colors"
                />
                <StatsCard 
                  title="QR Scans" 
                  value={qrScans} 
                  icon="📱" 
                  color="hover:bg-purple-50 transition-colors"
                />
              </div>

              {/* Recent Scans */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-gray-600">🕒</span>
                  Recent Activity
                </h3>
                
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No scans yet</p>
                    <p className="text-sm">Start scanning to see activity here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scanHistory.slice(0, 10).map((record) => (
                      <HistoryItem key={record.id} record={record} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}