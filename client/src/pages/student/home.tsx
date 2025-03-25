import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { User, CalendarDays, BarChart, Check, Calendar, Info } from "lucide-react";
import { format } from "date-fns";

export default function StudentHome() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    setCurrentDate(format(new Date(), "EEEE, MMMM d, yyyy"));
  }, []);

  // Fetch active session
  const { data: activeSession } = useQuery({
    queryKey: ['/api/sessions/active'],
    retry: false
  });

  // Fetch student's attendance records
  const { data: attendanceRecords } = useQuery({
    queryKey: ['/api/attendance/me'],
  });

  // Calculate attendance rate
  const totalSessions = attendanceRecords?.length || 0;
  const presentSessions = attendanceRecords?.filter((record: any) => record.status === "present")?.length || 0;
  const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  // Check if student is checked in for the active session
  const isCheckedIn = attendanceRecords?.some(
    (record: any) => record.sessionId === activeSession?.id
  );

  // Get upcoming sessions (using next 3 sessions from the sessions list)
  const { data: allSessions } = useQuery({
    queryKey: ['/api/sessions'],
  });

  // In a real app, we would filter for future sessions
  // For this demo, we'll just use the first few sessions
  const upcomingSessions = allSessions?.slice(0, 3) || [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-primary-100 dark:bg-primary-900 p-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Welcome, {user?.name}</h2>
              <p className="text-muted-foreground">Student ID: {user?.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Session */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" />
              Active Session
            </h3>
            {activeSession ? (
              <div>
                {isCheckedIn ? (
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md mb-4 flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">You are checked in!</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {activeSession.name} • {new Date(activeSession.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-md mb-4 flex items-start">
                    <Info className="h-5 w-5 mr-2 text-yellow-500" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">You need to check in!</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Go to the Scan QR tab to mark your attendance.
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Session Details:</p>
                  <p className="font-medium">{activeSession.name}</p>
                  <p className="text-sm">
                    {activeSession.date} • {activeSession.time} ({activeSession.duration} min)
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active sessions at the moment</p>
                <p className="text-sm text-muted-foreground">Check back later or scan a QR code</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-primary" />
              Attendance Summary
            </h3>
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-xl font-semibold">{totalSessions}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-xl font-semibold text-green-500">{attendanceRate}%</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Present</span>
                  <span className="text-sm font-medium">{presentSessions}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{width: `${attendanceRate}%`}}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Absent</span>
                  <span className="text-sm font-medium">{totalSessions - presentSessions}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{width: `${totalSessions > 0 ? 100 - attendanceRate : 0}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            Upcoming Sessions
          </h3>
          {upcomingSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Session</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSessions.map((session: any) => (
                    <tr key={session.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm">{session.name}</td>
                      <td className="px-4 py-3 text-sm">{session.date}</td>
                      <td className="px-4 py-3 text-sm">{session.time}</td>
                      <td className="px-4 py-3 text-sm">{session.duration} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No upcoming sessions scheduled at the moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
