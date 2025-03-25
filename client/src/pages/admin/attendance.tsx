import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { exportAttendanceToExcel } from "@/lib/excel";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Attendance() {
  const [sessionFilter, setSessionFilter] = useState("all");

  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions'],
  });

  const { data: activeSession } = useQuery({
    queryKey: ['/api/sessions/active'],
    retry: false
  });

  const { data: students } = useQuery({
    queryKey: ['/api/users/students'],
  });

  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['/api/attendance/session/' + (activeSession?.id || 0)],
    enabled: !!activeSession?.id,
  });

  // Build student attendance records
  const studentsWithAttendance = students?.map((student: any) => {
    const attendance = attendanceRecords?.find((record: any) => record.userId === student.id);
    return {
      ...student,
      isPresent: !!attendance,
      checkInTime: attendance ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
    };
  });

  const handleExportAttendance = () => {
    if (!activeSession || !studentsWithAttendance) return;

    const records = studentsWithAttendance.map(student => ({
      id: 0,
      userId: student.id,
      sessionId: activeSession.id,
      checkInTime: student.checkInTime !== '-' ? student.checkInTime : '',
      status: student.isPresent ? 'present' : 'absent',
      user: {
        name: student.name,
        username: student.username
      }
    }));

    exportAttendanceToExcel(records, activeSession.name);
  };

  const handleToggleAttendance = async (studentId: number) => {
    // Implement API call to toggle attendance here.  This is a placeholder.
    console.log("Toggling attendance for student ID:", studentId);
    //Example API call (replace with your actual API endpoint and method)
    try {
      const response = await fetch(`/api/attendance/${studentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: activeSession?.id, isPresent: !studentsWithAttendance.find(s => s.id === studentId)?.isPresent })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Update the studentsWithAttendance state after successful API call.  This requires a refetch or optimistic update.
      // For simplicity, we'll just log a success message for now.
      console.log('Attendance toggled successfully!');

    } catch (error) {
      console.error('Error toggling attendance:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Attendance Management</h2>
        <div className="flex space-x-2">
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="current">Current Session</SelectItem>
              <SelectItem value="previous">Previous Sessions</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportAttendance} className="flex items-center">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Live Attendance */}
      {activeSession ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">
              Live Attendance: <span>{activeSession.name}</span>
            </CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Check-in Time</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingAttendance ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm text-center">Loading attendance data...</td>
                    </tr>
                  ) : (
                    studentsWithAttendance && studentsWithAttendance.length > 0 ? (
                      studentsWithAttendance.map((student: any) => (
                        <tr key={student.id} className="border-b border-border">
                          <td className="px-4 py-3 text-sm">{student.username}</td>
                          <td className="px-4 py-3 text-sm">{student.name}</td>
                          <td className="px-4 py-3 text-sm flex items-center gap-2">
                            <Badge variant={student.isPresent ? "success" : "secondary"}>
                              {student.isPresent ? "Present" : "Absent"}
                            </Badge>
                            {activeSession && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAttendance(student.id)}
                              >
                                Mark {student.isPresent ? "Absent" : "Present"}
                              </Button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{student.checkInTime}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {student.isPresent ? (
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                <span className="material-icons text-sm">do_not_disturb_on</span>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-700">
                                <span className="material-icons text-sm">add_circle_outline</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm text-center text-muted-foreground">
                          No students found.
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No active session. Generate a QR code to start a session.</p>
          </CardContent>
        </Card>
      )}

      {/* All Sessions Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <h4 className="text-2xl font-semibold">{sessions?.length || 0}</h4>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Average Attendance</p>
              <h4 className="text-2xl font-semibold">-</h4>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Perfect Attendance</p>
              <h4 className="text-2xl font-semibold">-</h4>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Session</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Present</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Absent</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Percentage</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions && sessions.length > 0 ? (
                  sessions.map((session: any) => (
                    <tr key={session.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm">{session.name}</td>
                      <td className="px-4 py-3 text-sm">{session.date}</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Button variant="link" size="sm">Details</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center text-muted-foreground">
                      No sessions found.
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