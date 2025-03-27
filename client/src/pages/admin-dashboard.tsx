import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/admin/sidebar";
import DashboardHome from "@/pages/admin/dashboard-home";
import QRGenerator from "@/pages/admin/qr-generator";
import Attendance from "@/pages/admin/attendance";
import Students from "@/pages/admin/students";
import Reports from "@/pages/admin/reports";
import QRTest from "@/pages/admin/qr-test";
import { cn } from "@/lib/utils";

type Attendance = {id: number};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await fetch('/api/sessions');
      return response.json();
    }
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const response = await fetch('/api/attendance');
      return response.json();
    }
  });

  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');

  const createSession = async () => {
    if (!sessionName || !sessionDate || !sessionTime) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ 
          name: sessionName,
          date: sessionDate,
          time: sessionTime,
          is_active: true
        }]);
      if (error) throw error;
      console.log("Session created:", data);
      setIsCreateSessionOpen(false);
      setSessionName('');
      setSessionDate('');
      setSessionTime('');
    } catch (error) {
      console.error("Error creating session:", error);
      alert('Failed to create session');
    }
  };

  const refetchSessions = () => {
    if (sessions && typeof sessions.refetch === 'function') {
      sessions.refetch();
    } else {
      console.warn("Cannot refetch sessions: sessions object is undefined or missing refetch method");
    }
  };

  const refetchAttendance = () => {
    if (attendance && typeof attendance.refetch === 'function') {
      attendance.refetch();
    } else {
      console.warn("Cannot refetch attendance: attendance object is undefined or missing refetch method");
    }
  };

  useEffect(() => {
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        if (payload.table === 'sessions') {
          refetchSessions();
        }
        if (payload.table === 'attendance') {
          refetchAttendance();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.role !== "admin") {
      setLocation("/student");
    }
  }, [user, setLocation]);

  useEffect(() => {
    const path = location.split("/")[2] || "home";
    setActiveTab(path);
  }, [location]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node) &&
          headerRef.current &&
          !headerRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Make sure the toggle function is properly implemented
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // Log for debugging
    console.log("Toggle sidebar clicked, new state:", !sidebarOpen);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Backdrop overlay for all screen sizes when sidebar is open */}
      <div 
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/50 z-20 transition-opacity",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} activeTab={activeTab} />
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <header ref={headerRef} className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between mx-auto px-4 max-w-7xl">
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="icon" 
                onClick={toggleSidebar}
                aria-label="Toggle Menu"
                className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Robotics Club</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-medium">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center">Create New Session</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Session Name</Label>
                      <Input 
                        id="session-name" 
                        placeholder="Enter session name" 
                        value={sessionName} 
                        onChange={(e) => setSessionName(e.target.value)} 
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-date">Date</Label>
                      <Input 
                        id="session-date" 
                        type="date" 
                        value={sessionDate} 
                        onChange={(e) => setSessionDate(e.target.value)} 
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-time">Time</Label>
                      <Input 
                        id="session-time" 
                        type="time" 
                        value={sessionTime} 
                        onChange={(e) => setSessionTime(e.target.value)} 
                        className="w-full"
                      />
                    </div>
                  </div>
                  <Button onClick={createSession} className="w-full">
                    Create Session
                  </Button>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          {activeTab === "home" && <DashboardHome />}
          {activeTab === "qr-generator" && <QRGenerator />}
          {activeTab === "qr-test" && <QRTest />}
          {activeTab === "attendance" && <Attendance />}
          {activeTab === "students" && <Students />}
          {activeTab === "reports" && <Reports />}
        </main>
      </div>
    </div>
  );
}