import { useState, useEffect } from "react";
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

  // Fetch active session (but scanner should work even without it)
  const { data: activeSession } = useQuery<Session>({
    queryKey: ['/api/sessions/active'],
    retry: false,
  });

  // Check if student is already checked in
  const { data: attendanceRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/me'],
  });

  const isCheckedIn = attendanceRecords?.some(
    (record) => record.sessionId === activeSession?.id
  );

  useEffect(() => {
    if (activeSession) {
      setScanSuccess(isCheckedIn || false);
      setScanError(false);
      setErrorMessage("");
      setIsExpired(false);
    }
  }, [activeSession, isCheckedIn]);

  const handleQrCodeScan = async (decodedText: string) => {
    try {
      // Reset states
      setScanSuccess(false);
      setScanError(false);
      setErrorMessage("");
      setIsExpired(false);
      
      let parsedQR;
      try {
        parsedQR = JSON.parse(decodedText);
        if (!parsedQR.sessionId) {
          throw new Error("Invalid QR code format");
        }
      } catch (parseError) {
        throw new Error("Invalid QR code format - could not parse QR data");
      }

      await markAttendanceWithQR(decodedText);
      setScanSuccess(true);
      refetchAttendance();

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
  
  // Get the refetch function from the query
  const { refetch: refetchAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/me'],
    enabled: false, // Disable automatic fetching since we'll trigger it manually
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <QrCode className="mr-2 h-5 w-5 text-primary" />
            Scan QR Code
          </h3>
          <p className="text-muted-foreground mb-6">
            Scan the QR code displayed by your instructor to mark your attendance.
          </p>

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
                  <Html5QrcodePlugin 
                    fps={10}
                    qrCodeSuccessCallback={handleQrCodeScan}
                    qrCodeErrorCallback={() => {}}
                    disableFlip={false}
                  />
                </div>
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
