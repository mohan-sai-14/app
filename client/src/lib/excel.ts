import { apiRequest } from "./queryClient";
import * as XLSX from 'xlsx';

interface Student {
  id: number;
  username: string;
  name: string;
  email: string;
  status: string;
  attendanceRate?: string | number;
}

interface AttendanceRecord {
  id: number;
  sessionId: number;
  userId: number;
  checkInTime: string;
  status: string;
  user?: {
    name: string;
    username: string;
  };
  session?: {
    name: string;
    date: string;
    time: string;
  };
}

interface SessionSummary {
  id: number;
  name: string;
  date: string;
  time: string;
  present: number;
  absent: number;
  percentage: string;
}

// Function to export students to Excel
export async function exportStudentsToExcel(students: Student[]) {
  const worksheet = XLSX.utils.json_to_sheet(students.map(student => ({
    'Student ID': student.username,
    'Name': student.name,
    'Email': student.email,
    'Status': student.status,
    'Attendance Rate': student.attendanceRate || 'N/A'
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Students_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export attendance records to Excel
export async function exportAttendanceToExcel(attendanceRecords: AttendanceRecord[], sessionName: string) {
  const worksheet = XLSX.utils.json_to_sheet(attendanceRecords.map(record => ({
    'Student ID': record.user?.username || 'N/A',
    'Name': record.user?.name || 'N/A',
    'Status': record.status,
    'Check-in Time': new Date(record.checkInTime).toLocaleTimeString()
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const formattedDate = new Date().toISOString().split('T')[0];
  link.download = `Attendance_${sessionName.replace(/\s+/g, '_')}_${formattedDate}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export sessions summary to Excel
export async function exportSessionsToExcel(sessions: SessionSummary[]) {
  const worksheet = XLSX.utils.json_to_sheet(sessions.map(session => ({
    'Session': session.name,
    'Date': session.date,
    'Time': session.time,
    'Present': session.present,
    'Absent': session.absent,
    'Attendance Rate': session.percentage
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sessions');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Sessions_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Import students from Excel file
export async function importStudentsFromExcel(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const students = jsonData.map((row: any) => ({
          username: row['Student ID'],
          name: row['Name'],
          email: row['Email'] || `${row['Student ID']}@example.com`,
          password: 'password123', // Default password
          role: 'student',
          status: row['Status'] || 'active'
        }));
        
        resolve(students as Student[]);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
