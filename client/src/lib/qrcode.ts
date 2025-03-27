import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

// QR Code generation
export async function generateSessionQRCode(sessionData: {
  name: string;
  date: string;
  time: string;
  duration: number;
}) {
  // Create a unique QR code content with session data and timestamp
  const timestamp = Date.now();
  const qrCodeContent = JSON.stringify({
    sessionId: timestamp, // Use timestamp as temporary session ID
    name: sessionData.name,
    date: sessionData.date,
    time: sessionData.time,
    duration: sessionData.duration,
    generatedAt: new Date().toISOString(),
    expiresAfter: 20 // QR code expires after 20 minutes (increased from 10)
  });

  // Set expiry time to 20 minutes from now
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  try {
    // Create the session with QR data
    const response = await apiRequest("POST", "/api/sessions", {
      name: sessionData.name,
      date: sessionData.date,
      time: sessionData.time,
      duration: sessionData.duration,
      qrCode: qrCodeContent,
      expiresAt,
      isActive: true
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("QR code generation error:", errorData);
      throw new Error(errorData.message || "Failed to create session");
    }

    const newSession = await response.json();
    
    // Update QR code content with the actual session ID from the database
    const updatedQrContent = JSON.stringify({
      sessionId: newSession.id,
      name: sessionData.name,
      date: sessionData.date,
      time: sessionData.time,
      duration: sessionData.duration,
      generatedAt: new Date().toISOString(),
      expiresAfter: 20 // QR code expires after 20 minutes (increased from 10)
    });

    // Update the session with the correct QR code content
    await apiRequest("PUT", `/api/sessions/${newSession.id}`, {
      qrCode: updatedQrContent
    });
    
    // Invalidate sessions query to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });

    return newSession;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw error;
  }
}

// Mark attendance using QR code
export async function markAttendanceWithQR(qrContent: string) {
  try {
    // Parse QR code content
    const parsedContent = JSON.parse(qrContent);
    
    if (!parsedContent.sessionId) {
      throw new Error('Invalid QR code format');
    }
    
    // Check for client-side expiration if the QR code has expiresAfter property
    if (parsedContent.generatedAt && parsedContent.expiresAfter) {
      const generatedTime = new Date(parsedContent.generatedAt).getTime();
      // Add a buffer to the expiration time (extra 5 minutes to ensure students can scan)
      const expirationTime = generatedTime + ((parsedContent.expiresAfter + 5) * 60 * 1000);
      const currentTime = Date.now();
      
      if (currentTime > expirationTime) {
        throw new Error('QR code has expired');
      }
    }
    
    // Verify the session exists and is active
    const sessionResponse = await fetch(`/api/sessions/${parsedContent.sessionId}`, {
      credentials: 'include',
    });
    
    if (!sessionResponse.ok) {
      throw new Error('Session not found or expired');
    }
    
    const session = await sessionResponse.json();
    
    if (!session.isActive) {
      throw new Error('Session is no longer active');
    }
    
    // Additional check for server-side expiration - add buffer time of 5 minutes
    if (session.expiresAt) {
      const serverExpiryTime = new Date(session.expiresAt).getTime();
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (currentTime > (serverExpiryTime + bufferTime)) {
        throw new Error('QR code has expired');
      }
    }
    
    // Mark attendance
    const response = await apiRequest("POST", "/api/attendance", {
      sessionId: parseInt(parsedContent.sessionId)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark attendance');
    }
    
    const result = await response.json();
    
    // Invalidate attendance queries
    queryClient.invalidateQueries({ queryKey: ['/api/attendance/me'] });
    
    return result;
  } catch (error) {
    throw error;
  }
}

// QR code expiration check
export function isQRCodeExpired(session: any) {
  if (!session || !session.expiresAt) {
    return true;
  }
  
  const expiryTime = new Date(session.expiresAt).getTime();
  const currentTime = Date.now();
  
  return currentTime > expiryTime;
}

// Calculate time remaining for QR code validity
export function getQRCodeTimeRemaining(session: any) {
  if (!session || !session.expiresAt) {
    return "0:00";
  }
  
  const expiryTime = new Date(session.expiresAt).getTime();
  const currentTime = Date.now();
  const timeRemaining = Math.max(0, expiryTime - currentTime);
  
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
