import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Users, CalendarClock, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth"; // Import authentication hook

export default function DashboardHome() {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    setCurrentDate(format(new Date(), "EEEE, MMMM d, yyyy"));
  }, []);

  const { data: students } = useQuery({
    queryKey: ["/api/users/students"],
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: activeSession } = useQuery({
    queryKey: ["/api/sessions/active"],
    retry: false,
  });

  // Stats calculation
  const totalStudents = students?.length || 0;
  const totalSessions = sessions?.length || 0;

  const recentSessionId =
    activeSession?.id || (sessions?.length > 0 ? sessions[0].id : null);

  const { data: recentAttendance } = useQuery({
    queryKey: ["/api/attendance/session/" + recentSessionId],
    enabled: !!recentSessionId,
  });

  const presentStudents = recentAttendance?.length || 0;
  const absentStudents = totalStudents - presentStudents;
  const attendanceRate =
    totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

  return (
    <div className="mx-auto">
      {/* Header without Logout Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">{currentDate}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">
                  Today's Attendance
                </p>
                <h3 className="text-2xl font-semibold">
                  {presentStudents}/{totalStudents}
                </h3>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-green-500 font-medium">
                {attendanceRate}%
              </span>
              <span className="text-muted-foreground"> present</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <h3 className="text-2xl font-semibold">{totalStudents}</h3>
              </div>
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2">
                <Users className="h-5 w-5 text-orange-500 dark:text-orange-300" />
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-orange-500 dark:text-orange-300 font-medium">
                {totalStudents > 0 ? `+${totalStudents}` : "No"}
              </span>
              <span className="text-muted-foreground"> students enrolled</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <h3 className="text-2xl font-semibold">
                  {activeSession ? 1 : 0}
                </h3>
              </div>
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                <CalendarClock className="h-5 w-5 text-green-500 dark:text-green-300" />
              </div>
            </div>
            <div className="mt-2 text-sm flex items-center">
              {activeSession ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  <span className="text-muted-foreground">Session active</span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  No active sessions
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Absent Students</p>
                <h3 className="text-2xl font-semibold">{absentStudents}</h3>
              </div>
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-2">
                <UserMinus className="h-5 w-5 text-red-500 dark:text-red-300" />
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-red-500 font-medium">
                {totalStudents > 0
                  ? `${Math.round((absentStudents / totalStudents) * 100)}%`
                  : "0%"}
              </span>
              <span className="text-muted-foreground"> absent</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">
            Recent Sessions
          </CardTitle>
          <Button variant="link" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions && sessions.length > 0 ? (
                  sessions.slice(0, 3).map((session: any) => (
                    <tr key={session.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm">{session.date}</td>
                      <td className="px-4 py-3 text-sm">{session.name}</td>
                      <td className="px-4 py-3 text-sm">-/-</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Button variant="link" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm text-center text-muted-foreground"
                    >
                      No sessions found. Create a session to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
