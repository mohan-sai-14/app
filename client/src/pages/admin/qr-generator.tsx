import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid"; // Import UUID generator
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Download, QrCode as QrCodeIcon, Check, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase"; // Import Supabase client
import { useQuery } from "@tanstack/react-query";
import { format, addMinutes, parseISO } from "date-fns"; // Add this import for date formatting

const formSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.coerce
    .number()
    .min(1, "Duration must be at least 1 minute")
    .max(60, "Duration cannot exceed 60 minutes"),
  expiresAt: z.string().min(1, "Expiration time is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function QRGenerator() {
  const [qrValue, setQrValue] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Query to refresh sessions list
  const { refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('sessions').select('*');
      return data || [];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      duration: 10,
      expiresAt: format(addMinutes(new Date(), 10), "yyyy-MM-dd'T'HH:mm"), // Default to 10 minutes from now
    },
  });

  // Clear error message when form is changed
  useEffect(() => {
    const subscription = form.watch(() => {
      if (errorMessage) {
        setErrorMessage(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, errorMessage]);

  // Set up countdown timer
  useEffect(() => {
    if (!expiryTime) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
      
      if (diff <= 0) {
        setTimeLeft(0);
        setQrValue("");
        setQrUrl("");
        setSessionSaved(false);
        setExpiryTime(null);
        clearInterval(timer);
        toast({
          variant: "destructive",
          title: "QR Code Expired",
          description: "The QR code has expired. Please generate a new one if needed.",
        });
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiryTime, toast]);
  
  // Format time left for display
  const formatTimeLeft = (seconds: number | null): string => {
    if (seconds === null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date for better consistency with database
  const formatDateForDB = (dateString: string) => {
    try {
      // Keep the date in YYYY-MM-DD format
      return dateString;
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  // Format time for better consistency with database
  const formatTimeForDB = (timeString: string) => {
    try {
      // Keep the time in HH:MM format
      return timeString;
    } catch (e) {
      console.error("Error formatting time:", e);
      return timeString;
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setSessionSaved(false);
      setErrorMessage(null);
      
      // Format date and time for consistency
      const formattedDate = formatDateForDB(data.date);
      const formattedTime = formatTimeForDB(data.time);
      
      // Generate a unique session ID
      const sessionId = uuidv4();

      // Convert the expiration time to UTC for storage
      const localExpirationDate = new Date(data.expiresAt);
      const utcExpirationDate = new Date(localExpirationDate.getTime() - localExpirationDate.getTimezoneOffset() * 60000);
      
      // Create QR data object with formatted date and time
      const qrData = {
        sessionId: sessionId,
        name: data.name,
        date: formattedDate,
        time: formattedTime,
        duration: data.duration,
        generatedAt: new Date().toISOString(),
        expiresAfter: data.duration,
        expiresAt: utcExpirationDate.toISOString() // Include exact expiration time
      };

      // Convert to string for QR code
      const qrString = JSON.stringify(qrData);
      setQrValue(qrString);

      // Generate QR code URL for download
      const url = await QRCode.toDataURL(qrString);
      setQrUrl(url);

      // Set expiry time for countdown (use local time for display)
      setExpiryTime(localExpirationDate);
      
      // Format expires_at for PostgreSQL (UTC time)
      const expiresAt = utcExpirationDate.toISOString();

      // For debugging
      console.log("Form data being submitted:", {
        ...data,
        localExpirationTime: localExpirationDate.toISOString(),
        utcExpirationTime: expiresAt
      });
      
      // Prepare the data for insertion
      const sessionData = {
        name: data.name,
        date: formattedDate,
        time: formattedTime,
        duration: data.duration,
        qr_code: qrString,
        expires_at: expiresAt,
        is_active: true
      };
      
      console.log("Inserting session with data:", sessionData);

      // Insert session data into Supabase
      const { data: insertedData, error } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Update UI state
      setSessionSaved(true);
      refetchSessions();

      // Show success message with local time
      toast({
        title: "QR Code Generated",
        description: `New QR code has been generated and will expire at ${format(localExpirationDate, 'dd/MM/yyyy HH:mm')}.`,
      });
    } catch (error) {
      console.error("Error generating QR code or saving session:", error);
      let errorMsg = "An error occurred while generating the QR code or saving the session.";
      
      // Extract more specific error message if available
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMsg = String((error as any).message);
      }
      
      setErrorMessage(errorMsg);
      
      toast({
        variant: "destructive",
        title: "Failed to generate QR code",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQR = () => {
    if (!qrUrl) return;

    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qrcode-${form.getValues().name.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">QR Code Generator</h2>
      </div>

      {errorMessage && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
          <h3 className="font-medium">Error Occurred</h3>
          <p className="text-sm">{errorMessage}</p>
          <p className="text-sm mt-2">Please check your data and try again.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New Session</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter session name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) => {
                            field.onChange(e);
                            // Log the selected time for verification
                            console.log("Selected expiration time:", new Date(e.target.value).toISOString());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <QrCodeIcon className="mr-2 h-4 w-4" /> Generate QR Code
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QR Code Output</CardTitle>
          </CardHeader>
          <CardContent>
            {qrValue ? (
              <div className="flex flex-col items-center space-y-4">
                <div
                  ref={qrRef}
                  className="w-64 h-64 border-4 border-primary p-2 rounded-lg flex items-center justify-center relative"
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={240}
                    level="H"
                    includeMargin={true}
                  />
                  {timeLeft !== null && (
                    <div className="absolute -top-4 -right-4 bg-yellow-500 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-md">
                      {formatTimeLeft(timeLeft)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={downloadQR} className="flex items-center">
                    <Download className="mr-2 h-4 w-4" /> Download QR Code
                  </Button>
                  {sessionSaved && (
                    <div className="flex items-center text-sm text-green-500 font-medium">
                      <Check className="h-4 w-4 mr-1" /> Saved to database
                    </div>
                  )}
                </div>
                {timeLeft !== null && (
                  <div className="text-sm text-muted-foreground text-center">
                    This QR code will expire in <span className="font-medium text-yellow-600">{formatTimeLeft(timeLeft)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <QrCodeIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Generate a QR code to see the output here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
