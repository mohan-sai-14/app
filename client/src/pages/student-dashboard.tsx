import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import StudentHeader from "@/components/student/header";
import StudentHome from "@/pages/student/home";
import StudentScanner from "@/pages/student/scanner";
import StudentAttendance from "@/pages/student/attendance";
import { TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const path = location.split("/")[2] || "home";
    setActiveTab(path);
  }, [location]);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.role !== "student") {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(value === "home" ? "/student" : `/student/${value}`);
  };

  if (!user || user.role !== "student") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <StudentHeader user={user} onLogout={logout} />

      {/* Student Tabs */}
      <div className="bg-white dark:bg-background shadow-sm">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="scanner">Scan QR</TabsTrigger>
              <TabsTrigger value="attendance">My Attendance</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Student Content */}
      <main className="flex-1 bg-gray-100 dark:bg-background">
        <Switch>
          <Route path="/student" component={StudentHome} />
          <Route path="/student/scanner">
            {/* Auto-start scanner without a button */}
            <StudentScanner autoStart={true} />
          </Route>
          <Route path="/student/attendance" component={StudentAttendance} />
          <Route path="/student/*">
            <StudentHome />
          </Route>
        </Switch>
      </main>
    </div>
  );
}
