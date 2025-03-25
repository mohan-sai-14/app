import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { History, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export default function StudentAttendance() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30days");

  // Fetch student's attendance records
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['/api/attendance/me'],
  });

  const getFormattedAttendanceRecords = () => {
    if (!attendanceRecords) return [];
    
    return attendanceRecords
      .filter((record: any) => {
        // Apply status filter
        if (statusFilter === "present" && record.status !== "present") return false;
        if (statusFilter === "absent" && record.status !== "absent") return false;
        
        // Apply date filter (this would need to be implemented with proper date filtering)
        // For demo purposes, we're showing all
        return true;
      })
      .map((record: any) => {
        const session = record.session || {};
        const checkInTime = record.checkInTime 
          ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '-';
        
        return {
          id: record.id,
          sessionId: record.sessionId,
          sessionName: session.name || "Unknown Session",
          date: session.date || "Unknown Date",
          time: session.time || "Unknown Time",
          status: record.status,
          checkInTime: checkInTime
        };
      });
  };

  const filteredRecords = getFormattedAttendanceRecords();

  const handleDownloadReport = () => {
    // In a real app, this would generate and download an Excel file
    // For this demo, we'll just show an alert
    alert("This would download an attendance report Excel file in a real application.");
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History className="mr-2 h-5 w-5 text-primary" />
            Attendance History
          </h3>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="present">Present Only</SelectItem>
                  <SelectItem value="absent">Absent Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleDownloadReport} className="flex items-center">
              <Download className="h-4 w-4 mr-1" /> Download Report
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Session</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Check-in</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-center">Loading attendance data...</td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record: any) => (
                    <tr key={record.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm">{record.sessionName}</td>
                      <td className="px-4 py-3 text-sm">{record.date}</td>
                      <td className="px-4 py-3 text-sm">{record.time}</td>
                      <td className="px-4 py-3 text-sm">
                        {record.status === "present" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Present
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Absent
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.checkInTime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-center text-muted-foreground">
                      No attendance records found.
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
