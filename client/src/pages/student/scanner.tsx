import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, QrCode, ClockIcon } from "lucide-react";
import { markAttendanceWithQR } from "@/lib/qrcode";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Html5QrcodePlugin from '@/components/student/html5-qrcode-plugin';

// Define types for the data returned from API
interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  checkInTime: string;
  status: string;
}

interface Session {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  expiresAt: string;
  isActive: boolean;
}

export default function StudentScanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const scanAttemptRef = useRef(0);

  console.log("Rendering StudentScanner component");

  // Fetch active session (but scanner should work even without it)
  const { data: activeSession, isLoading: sessionLoading, error: sessionError } = useQuery<Session>({
    queryKey: ['/api/sessions/active'],
    retry: 3,
    refetchInterval: 5000,  // Refetch every 5 seconds to ensure we have the latest session data
    onSuccess: (data) => {
      console.log("Active session data fetched:", data);
    },
    onError: (error) => {
      console.error("Error fetching active session:", error);
    }
  });

  // Check if student is already checked in
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/me'],
    onSuccess: (data) => {
      console.log("Attendance records fetched:", data?.length);
    },
    onError: (error) => {
      console.error("Error fetching attendance records:", error);
    }
  });

  const isCheckedIn = attendanceRecords?.some(
    (record) => record.sessionId === activeSession?.id
  );

  useEffect(() => {
    console.log("Effect running - activeSession:", activeSession?.id, "isCheckedIn:", isCheckedIn);
    if (activeSession) {
      setScanSuccess(isCheckedIn || false);
      setScanError(false);
      setErrorMessage("");
      setIsExpired(false);
    }
  }, [activeSession, isCheckedIn]);

  useEffect(() => {
    // If checked in, stop scanning
    if (isCheckedIn) {
      console.log("Already checked in, stopping scanner");
      setIsScanning(false);
    } else {
      console.log("Not checked in, enabling scanner");
      setIsScanning(true);
    }
  }, [isCheckedIn]);

  // Handle QR code scan
  const handleQrCodeScan = async (decodedText: string) => {
    try {
      console.log("QR code scanned, attempt:", ++scanAttemptRef.current);
      
      // Reset states
      setScanSuccess(false);
      setScanError(false);
      setErrorMessage("");
      setIsExpired(false);
      
      let parsedQR;
      try {
        console.log("Parsing QR code content");
        parsedQR = JSON.parse(decodedText);
        if (!parsedQR.sessionId) {
          throw new Error("Invalid QR code format");
        }
        console.log("QR code contains sessionId:", parsedQR.sessionId);
      } catch (parseError) {
        console.error("Failed to parse QR code:", parseError);
        throw new Error("Invalid QR code format - could not parse QR data");
      }

      console.log("Marking attendance with QR code for session:", parsedQR.sessionId);
      await markAttendanceWithQR(decodedText);
      
      console.log("Attendance marked successfully");
      setScanSuccess(true);
      
      // Refetch attendance data
      console.log("Refetching attendance data");
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/me'] });

      // Stop scanning if successful
      setIsScanning(false);

      // Show success toast
      toast({
        title: "Attendance Marked",
        description: "You have successfully checked in!",
      });
    } catch (error: any) {
      console.error("QR scan error:", error);
      setScanError(true);
      
      // Check if it's an expiration error
      if (error.message && error.message.toLowerCase().includes("expired")) {
        console.log("QR code has expired");
        setIsExpired(true);
        setErrorMessage("This QR code has expired. Please ask for a new code.");
      } else {
        setErrorMessage(error.message || "Failed to process QR code");
      }

      // Show error toast
      toast({
        variant: "destructive",
        title: isExpired ? "QR Code Expired" : "Scan Failed",
        description: error.message || "Error scanning QR code. Please try again.",
      });
    }
  };

  // Handle QR code scan error (from scanner library)
  const handleQrCodeError = (errorMessage: string) => {
    console.log("QR scanner error:", errorMessage);
    // We don't want to show these errors to the user as they're typically just "no QR code found"
    // Only log them for debugging
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <QrCode className="mr-2 h-5 w-5 text-primary" />
            Scan QR Code
          </h3>
          
          {sessionLoading ? (
            <p className="text-center text-muted-foreground">Loading session information...</p>
          ) : sessionError ? (
            <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-4">
              <p className="text-red-800 dark:text-red-200">
                {sessionError instanceof Error ? sessionError.message : "Error loading session"}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mb-6">
              Scan the QR code displayed by your instructor to mark your attendance.
              {activeSession ? ` Current session: ${activeSession.name}` : " No active session found."}
            </p>
          )}

          <div className="flex flex-col items-center">
            {isCheckedIn ? (
              <div className="w-full bg-green-50 dark:bg-green-900 p-4 rounded-md mb-4 flex items-start">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Already checked in!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You have already marked your attendance for {activeSession?.name || "this session"}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Fixed dimensions for QR scanner */}
                <div className="qr-scanner-container w-[300px] h-[300px] max-w-full mx-auto mb-4 relative">
                  {isScanning && (
                    <Html5QrcodePlugin 
                      fps={10}
                      qrCodeSuccessCallback={handleQrCodeScan}
                      qrCodeErrorCallback={handleQrCodeError}
                      disableFlip={false}
                    />
                  )}
                  {!isScanning && !scanSuccess && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                      <p className="text-white">Scanner paused</p>
                    </div>
                  )}
                </div>
                
                {!isScanning && !scanSuccess && (
                  <button 
                    className="px-4 py-2 bg-primary text-white rounded-md mt-2"
                    onClick={() => setIsScanning(true)}
                  >
                    Resume Scanner
                  </button>
                )}
              </>
            )}
          </div>

          {/* QR Scan Success Message */}
          {scanSuccess && !isCheckedIn && (
            <div className="mt-6 bg-green-50 dark:bg-green-900 p-4 rounded-md">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Successfully checked in!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your attendance has been recorded for this session.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QR Scan Error Message */}
          {scanError && (
            <div className={`mt-6 ${isExpired ? 'bg-yellow-50 dark:bg-yellow-900' : 'bg-red-50 dark:bg-red-900'} p-4 rounded-md`}>
              <div className="flex items-start">
                {isExpired ? (
                  <ClockIcon className="h-5 w-5 mr-2 text-yellow-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                )}
                <div>
                  <p className={`font-medium ${isExpired ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                    {isExpired ? 'QR Code Expired' : 'Error scanning QR code'}
                  </p>
                  <p className={`text-sm ${isExpired ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                    {errorMessage || "The QR code may be invalid or expired. Please try again or contact your instructor."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
