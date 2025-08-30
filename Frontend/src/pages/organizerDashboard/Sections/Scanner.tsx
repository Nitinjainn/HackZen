import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { redeemTicket } from '../../../lib/tickets';

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

  return (
    <div className={`p-3 rounded-md border-l-4 ${
      record.status === 'success' 
        ? 'bg-green-900/20 border-green-500' 
        : 'bg-red-900/20 border-red-500'
    } mb-2`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs ${
              record.status === 'success' 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {record.status === 'success' ? '✅ Admitted' : '❌ Denied'}
            </span>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {record.scanMethod === 'qr' ? 'QR' : 'Manual'}
            </span>
          </div>
          <p className="text-xs text-gray-300 mb-1 font-mono">
            ID: {record.ticketId}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {record.message}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>{formatTime(record.timestamp)}</div>
        </div>
      </div>
    </div>
  );
};

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Key Fix #1: Use a ref to hold the scanner instance so we can control it from anywhere.
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState("idle"); // idle, scanning, validating, success, failed
  const [scanMessage, setScanMessage] = useState("Point camera at a QR code");
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [eventName] = useState("Tech Conference 2024");

  // Calculate stats
  const totalScans = scanHistory.length;
  const successfulScans = scanHistory.filter(record => record.status === 'success').length;
  const failedScans = scanHistory.filter(record => record.status === 'failed').length;

  useEffect(() => {
    if (videoRef.current && !scannerRef.current) {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          onDecodeError: () => {}, // Keep it silent to avoid spamming messages
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current = scanner; // Store the instance
      
      scanner.start().then(() => {
        setStatus("scanning");
      }).catch(err => {
        setStatus("failed");
        setScanMessage("Could not start camera. Please grant permission.");
        console.error(err);
      });
    }

    // Cleanup when the component unmounts
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
    setScanHistory(prev => [newRecord, ...prev.slice(0, 19)]); // Keep last 20 records
  };

  const processTicketRedemption = async (ticketId: string, nonce: string, scanMethod: 'qr' | 'manual') => {
    // Key Fix #2: Create a re-usable function to process the ticket.
    // This prevents code duplication between QR scan and manual entry.
    
    // Key Fix #3: Add a guard clause to prevent multiple scans while one is processing.
    if (status === 'validating' || status === 'success' || status === 'failed') {
      return;
    }

    // Key Fix #4: Stop the scanner immediately to prevent re-scans.
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
      // Key Fix #5: Use a 'finally' block to reliably reset the scanner after a delay.
      setTimeout(() => {
        setStatus("scanning");
        setScanMessage("Ready for next scan...");
        if (videoRef.current) { // Ensure video is still there before starting
          scannerRef.current?.start();
        }
      }, 3000); // Wait 3 seconds before resetting
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      const url = new URL(qrData);
      const ticketId = url.searchParams.get("ticketId");
      const nonce = url.searchParams.get("nonce");
      await processTicketRedemption(ticketId || "", nonce || "manual_redeem", 'qr');
    } catch (e) {
      // This handles cases where the QR code is not a valid URL
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
    // For manual redemption, we always use the "manual_redeem" nonce
    await processTicketRedemption(ticketIdInput, "manual_redeem", 'manual');
  };

  const getStatusColor = () => {
    if (status === 'success') return 'bg-green-500/90';
    if (status === 'failed') return 'bg-red-500/90';
    if (status === 'validating') return 'bg-blue-500/90';
    return 'opacity-0';
  };

  return (
    <div className="flex gap-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Scanner Section - Keep original styling */}
      <div className="max-w-md text-center bg-gray-900 text-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Ticket Scanner</h2>
        
        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-700">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-white font-bold transition-opacity duration-300 pointer-events-none ${getStatusColor()}`}>
            <StatusIcon status={status} />
            {status !== 'scanning' && status !== 'idle' && (
              <p className="mt-4 text-xl">{scanMessage}</p>
            )}
          </div>
        </div>
        <div className="mt-4 text-lg font-medium h-6">{status === 'scanning' && scanMessage}</div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-xl font-semibold mb-3">Or, Enter Ticket ID Manually</h3>
          <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={ticketIdInput}
                onChange={(e) => setTicketIdInput(e.target.value)}
                placeholder="Enter Ticket ID" 
                className="flex-grow p-3 border border-gray-600 bg-gray-800 rounded-md text-center text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" 
              />
              <button 
                onClick={handleManualRedeem}
                disabled={status === 'validating'}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-md hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Admit
              </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="flex-1 max-w-md bg-gray-900 text-white rounded-lg shadow-xl p-4">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Scan History</h2>
        
        {/* Event Info */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4 border border-gray-700">
          <h3 className="font-semibold text-white mb-1">{eventName}</h3>
          <p className="text-sm text-gray-400">Active scanning session</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-xl font-bold text-white">{totalScans}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-sm text-gray-400">Success</p>
            <p className="text-xl font-bold text-green-400">{successfulScans}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-sm text-gray-400">Failed</p>
            <p className="text-xl font-bold text-red-400">{failedScans}</p>
          </div>
        </div>

        {/* Recent Scans */}
        <div>
          <h3 className="font-semibold text-white mb-3">Recent Activity</h3>
          
          {scanHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p>No scans yet</p>
              <p className="text-sm">Start scanning to see activity</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {scanHistory.slice(0, 10).map((record) => (
                <HistoryItem key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}