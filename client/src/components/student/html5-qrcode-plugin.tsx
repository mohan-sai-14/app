import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const qrcodeRegionId = "html5qr-code-full-region";

interface Html5QrcodePluginProps {
  fps: number;
  qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void;
  qrCodeErrorCallback: (errorMessage: string, error: any) => void;
  disableFlip?: boolean;
}

const Html5QrcodePlugin = ({
  fps,
  qrCodeSuccessCallback,
  qrCodeErrorCallback,
  disableFlip = false
}: Html5QrcodePluginProps) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("QR Scanner: Initializing scanner");
    
    // Cleanup function for unmounting
    const cleanupScanner = () => {
      if (html5QrCodeRef.current?.isScanning) {
        console.log("QR Scanner: Cleaning up and stopping scanner");
        html5QrCodeRef.current
          .stop()
          .catch(err => console.error("QR Scanner: Failed to stop scanner", err));
      }
    };
    
    try {
      // Create an instance of Html5Qrcode
      html5QrCodeRef.current = new Html5Qrcode(qrcodeRegionId);
      
      const config = { 
        fps, 
        disableFlip,
        // Add additional configuration to handle the media error
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      };
      
      // Check if camera access is available
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Release the camera immediately
          stream.getTracks().forEach(track => track.stop());
          
          console.log("QR Scanner: Camera access granted, starting scanner");
          
          // Start scanning
          html5QrCodeRef.current?.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            (errorMessage, error) => {
              // Filter out non-critical errors
              if (errorMessage.includes("No QR code found")) {
                // This is normal behavior when no QR code is in view
                return;
              }
              
              console.log("QR Scanner error:", errorMessage);
              qrCodeErrorCallback(errorMessage, error);
            }
          ).catch(err => {
            console.error("QR Scanner: Failed to start scanner", err);
            setCameraError(`Failed to access camera: ${err.message || "Unknown error"}`);
          });
        })
        .catch(err => {
          console.error("QR Scanner: Camera access denied", err);
          setCameraError(`Camera access denied: ${err.message || "Please allow camera access and refresh the page"}`);
        });
    } catch (err: any) {
      console.error("QR Scanner: Error initializing scanner", err);
      setCameraError(`Error initializing scanner: ${err.message || "Unknown error"}`);
    }
    
    // Cleanup on unmount
    return cleanupScanner;
  }, [fps, qrCodeSuccessCallback, qrCodeErrorCallback, disableFlip]);
  
  return (
    <div className="w-full h-full">
      {cameraError ? (
        <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900 p-4 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-center">{cameraError}</p>
        </div>
      ) : (
        <div id={qrcodeRegionId} className="w-full h-full rounded-lg overflow-hidden" />
      )}
    </div>
  );
};

export default Html5QrcodePlugin;
