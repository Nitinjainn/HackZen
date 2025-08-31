import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { getTicket } from "../../../../lib/tickets";
import { getEvent } from "../../../../lib/events";
import type { EventDoc, TicketDoc } from "../../../../types/ticketing";
import { Button } from "../../../../ui/button";
import { ArrowLeft, Calendar, Clock, Ticket, Download, Share2, Copy } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardTicketView() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<TicketDoc | null>(null);
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    const fetchTicketData = async () => {
      try {
        const ticketDoc = await getTicket(ticketId);
        const eventDoc = await getEvent(ticketDoc.eventId);
        setTicket(ticketDoc);
        setEvent(eventDoc);
      } catch (e) {
        if (e instanceof Error) setError(e.message);
        else setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchTicketData();
  }, [ticketId]);

  // Generate **static** QR (single per ticket)
  useEffect(() => {
    if (!ticket) return;
    setQrValue(`${window.location.origin}/scan?ticketId=${ticket.id}`);
    // For extra security:
    // setQrValue(`${window.location.origin}/scan?ticketId=${ticket.id}&secret=${ticket.qrTokenHash}`);
  }, [ticket]);

  const handleDownloadQR = async () => {
    if (!ticket) return;
    
    setDownloading(true);
    try {
      // Wait for QR code to be rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const qrCanvas = document.querySelector('canvas');
      if (qrCanvas) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size with padding
        const padding = 40;
        canvas.width = qrCanvas.width + padding * 2;
        canvas.height = qrCanvas.height + padding * 2;
        
        // Fill background
        ctx!.fillStyle = '#ffffff';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx!.drawImage(qrCanvas, padding, padding);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `ticket-${ticket.id}-${event?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'event'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareTicket = async () => {
    if (!ticket || !event) return;
    
    setSharing(true);
    try {
      const startDate = new Date(event.startsAt);
      const shareData = {
        title: `Ticket for ${event.title}`,
        text: `My ticket for ${event.title} on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showCopySuccess();
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showCopySuccess();
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!ticket || !event) return;
    
    setCopying(true);
    try {
      const startDate = new Date(event.startsAt);
      const ticketInfo = `Ticket: ${event.title}
Date: ${startDate.toLocaleDateString()}
Time: ${startDate.toLocaleTimeString()}
Ticket ID: ${ticket.id}
${event.venue ? `Venue: ${event.venue}` : ''}
URL: ${window.location.href}`;
      
      await navigator.clipboard.writeText(ticketInfo);
      showCopySuccess();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = `Ticket: ${event.title}\nDate: ${startDate.toLocaleDateString()}\nTime: ${startDate.toLocaleTimeString()}\nTicket ID: ${ticket.id}\n${event.venue ? `Venue: ${event.venue}` : ''}\nURL: ${window.location.href}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopySuccess();
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        alert('Failed to copy to clipboard. Please try again.');
      }
    } finally {
      setCopying(false);
    }
  };

  const showCopySuccess = () => {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    successDiv.textContent = 'Copied to clipboard!';
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      successDiv.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 300);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="flex items-center gap-3 text-lg">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          Loading ticket...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="bg-red-900/50 border border-red-500/20 text-red-400 p-6 rounded-xl flex items-center gap-3 max-w-md">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          <div>
            <div className="font-semibold">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket || !event) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold text-white mb-2">Ticket not found</h3>
          <p className="text-gray-400">The requested ticket could not be located.</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startsAt);
  const statusMap = {
    redeemed: { label: "Redeemed", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    issued: { label: "Issued", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
    expired: { label: "Expired", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const status = statusMap[ticket.status] || { label: ticket.status, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            asChild
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors duration-200"
          >
            <Link to="/dashboard/tickets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to My Tickets</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>

        {/* Event Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
            {event.title}
          </h1>
          <span className={`text-sm font-medium rounded-full px-4 py-2 border ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Main Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* QR Code Section */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-4 sm:mb-6">Your QR Code</h2>
            <div className="bg-white p-4 sm:p-6 rounded-lg inline-block shadow-lg">
              <QRCode 
                value={qrValue} 
                size={Math.min(200, window.innerWidth - 100)} 
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-gray-400 text-sm mt-4 sm:mt-6 max-w-sm mx-auto">
              Show this QR code at the event entrance for quick check-in
            </p>
          </div>

          {/* Ticket Information */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 sm:mb-6">Ticket Information</h2>
            <div className="space-y-4">
              {/* Ticket ID */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 rounded-full">
                    <Ticket className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-gray-300 text-sm sm:text-base">Ticket ID</span>
                </div>
                <span className="text-white font-mono text-xs sm:text-sm break-all ml-2">
                  {ticket.id}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-cyan-500/20 rounded-full">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-gray-300 text-sm sm:text-base">Date</span>
                </div>
                <span className="text-white text-sm sm:text-base">
                  {startDate.toLocaleDateString()}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300 text-sm sm:text-base">Time</span>
                </div>
                <span className="text-white text-sm sm:text-base">
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Venue (if available) */}
              {event.venue && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-500/20 rounded-full">
                      <div className="w-4 h-4 text-orange-400">📍</div>
                    </div>
                    <span className="text-gray-300 text-sm sm:text-base">Venue</span>
                  </div>
                  <span className="text-white text-sm sm:text-base text-right max-w-[40%] truncate">
                    {event.venue}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Download/Share/Copy Options */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 sm:mb-6">Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={handleDownloadQR}
                disabled={downloading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white transition-colors duration-200 h-12"
              >
                <Download className="w-4 h-4 mr-2" />
                {downloading ? 'Downloading...' : 'Download QR'}
              </Button>
              <Button
                onClick={handleShareTicket}
                disabled={sharing}
                className="bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-200 h-12"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {sharing ? 'Sharing...' : 'Share Ticket'}
              </Button>
              <Button
                onClick={handleCopyToClipboard}
                disabled={copying}
                className="bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 h-12"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copying ? 'Copying...' : 'Copy Info'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}