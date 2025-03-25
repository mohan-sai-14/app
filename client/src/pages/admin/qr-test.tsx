import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ArrowRight, QrCode as QrCodeIcon, Lightbulb } from "lucide-react";
import { debugLog } from "@/lib/debug";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function QRTest() {
  const { toast } = useToast();
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("random");
  const qrRef = useRef<HTMLDivElement>(null);

  const generateRandomQRCode = async () => {
    try {
      // Generate random session data
      const timestamp = Date.now();
      const sessionData = {
        name: `Test Session ${timestamp}`,
        timestamp,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
      };
      
      // Convert to string for QR code
      const qrCodeContent = JSON.stringify(sessionData);
      debugLog("QR-TEST", "Generated random QR content", sessionData);
      setQrCodeData(qrCodeContent);
      
      // Generate QR code URL 
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeContent);
      setQrCodeUrl(qrCodeDataUrl);
      
      toast({
        title: "QR Code Generated",
        description: "Test QR code has been generated successfully.",
      });
    } catch (error: any) {
      console.error("QR generation error:", error);
      toast({
        variant: "destructive",
        title: "Failed to generate QR code",
        description: error.message || "An error occurred",
      });
    }
  };

  const generateCustomQRCode = async () => {
    if (!customText.trim()) {
      toast({
        variant: "destructive",
        title: "Input required",
        description: "Please enter some text for the QR code.",
      });
      return;
    }

    try {
      debugLog("QR-TEST", "Generating QR code with custom text", customText);
      setQrCodeData(customText);
      
      // Generate QR code URL
      const qrCodeDataUrl = await QRCode.toDataURL(customText);
      setQrCodeUrl(qrCodeDataUrl);
      
      toast({
        title: "Custom QR Code Generated",
        description: "Your custom QR code has been created.",
      });
    } catch (error: any) {
      console.error("Custom QR generation error:", error);
      toast({
        variant: "destructive",
        title: "Failed to generate QR code",
        description: error.message || "An error occurred",
      });
    }
  };

  const downloadQR = () => {
    if (!qrRef.current || !qrCodeUrl) return;
    
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">QR Code Test Lab</h2>
      </div>

      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
        <Lightbulb className="h-4 w-4 text-blue-500" />
        <AlertTitle>Testing Environment</AlertTitle>
        <AlertDescription>
          This page is for testing QR code generation directly in the browser, bypassing server API calls. 
          Use this to diagnose QR functionality issues.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate Test QR Code</CardTitle>
            <CardDescription>
              Create QR codes for testing the scanner functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="random">Random Session</TabsTrigger>
                <TabsTrigger value="custom">Custom Content</TabsTrigger>
              </TabsList>
              
              <TabsContent value="random" className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a QR code with random session data similar to what would be used in attendance tracking.
                </p>
                <Button onClick={generateRandomQRCode} className="w-full">
                  <QrCodeIcon className="mr-2 h-4 w-4" /> Generate Random Session QR Code
                </Button>
              </TabsContent>
              
              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="custom-text">Custom QR Content</Label>
                    <Input
                      id="custom-text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Enter any text or JSON string"
                    />
                  </div>
                  <Button onClick={generateCustomQRCode} className="w-full">
                    <ArrowRight className="mr-2 h-4 w-4" /> Generate Custom QR Code
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QR Code Output</CardTitle>
          </CardHeader>
          <CardContent>
            {qrCodeData ? (
              <div className="flex flex-col items-center space-y-4">
                <div ref={qrRef} className="w-64 h-64 border-4 border-primary p-2 rounded-lg flex items-center justify-center">
                  <QRCodeSVG 
                    value={qrCodeData} 
                    size={240} 
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <Button onClick={downloadQR} className="flex items-center">
                  <Download className="mr-2 h-4 w-4" /> Download QR Code
                </Button>
                
                <div className="mt-4 w-full">
                  <h4 className="text-sm font-medium mb-2">QR Code Content:</h4>
                  <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-w-full max-h-32">
                    {qrCodeData}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <QrCodeIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Generate a QR code to see the output here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}