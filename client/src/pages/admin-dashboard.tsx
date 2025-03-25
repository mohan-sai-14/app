import { useEffect, useState } from "react";
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

type Attendance = {id: number};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');

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
    sessions.refetch();
  };

  const refetchAttendance = () => {
    attendance.refetch();
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

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} activeTab={activeTab} />
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-4 border-b flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        <main className="p-6">
          <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="ml-auto" >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 p-4">
                <div>
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input id="session-name" type="text" placeholder="Enter session name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="session-date">Date</Label>
                  <Input id="session-date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="session-time">Time</Label>
                  <Input id="session-time" type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} required />
                </div>
                <Button onClick={createSession}>Create Session</Button>
              </div>
            </DialogContent>
          </Dialog>
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