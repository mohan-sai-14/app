import { useEffect, useRef } from 'react';
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
  
  useEffect(() => {
    // Create an instance of Html5Qrcode
    html5QrCodeRef.current = new Html5Qrcode(qrcodeRegionId);
    
    const config = { fps, disableFlip };
    
    // Start scanning
    html5QrCodeRef.current.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      qrCodeErrorCallback
    );
    
    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current
          .stop()
          .catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, [fps, qrCodeSuccessCallback, qrCodeErrorCallback, disableFlip]);
  
  return (
    <div>
      <div id={qrcodeRegionId} className="rounded-lg overflow-hidden" />
    </div>
  );
};

export default Html5QrcodePlugin;
