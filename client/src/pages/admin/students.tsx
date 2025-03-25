import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Upload, Search, Edit, Trash, Download } from "lucide-react";
import AddStudentModal from "@/components/admin/add-student-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportStudentsToExcel, importStudentsFromExcel } from "@/lib/excel";
import { Badge } from "@/components/ui/badge";

export default function Students() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ['/api/users/students'],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/students'] });
      toast({
        title: "Student Deleted",
        description: "The student has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete student",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleDeleteStudent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleExportStudents = () => {
    if (!students) return;
    exportStudentsToExcel(students);
  };

  const handleImportStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const studentData = await importStudentsFromExcel(files[0]);
      
      // For each student, create them via the API
      for (const student of studentData) {
        await apiRequest("POST", "/api/users", {
          username: student.username,
          password: "password123", // Default password
          name: student.name,
          email: student.email,
          role: "student",
          status: student.status || "active",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/students'] });
      
      toast({
        title: "Import Successful",
        description: `Imported ${studentData.length} students`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "An error occurred",
      });
    }
    
    // Clear the input
    event.target.value = "";
  };

  const filteredStudents = students?.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Student Management</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center">
            <UserPlus className="h-4 w-4 mr-1" /> Add Student
          </Button>
          <div className="relative">
            <input
              type="file"
              id="import-file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportStudents}
            />
            <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()} className="flex items-center">
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExportStudents}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Attendance Rate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center">Loading students...</td>
                  </tr>
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  filteredStudents.map((student: any) => (
                    <tr key={student.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm">{student.username}</td>
                      <td className="px-4 py-3 text-sm">{student.name}</td>
                      <td className="px-4 py-3 text-sm">{student.email}</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm">
                        {student.status === "active" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary mr-2">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center text-muted-foreground">
                      No students found. Add a student to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents && filteredStudents.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">1-{Math.min(filteredStudents.length, 10)}</span> of <span className="font-medium">{filteredStudents.length}</span> students
              </div>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100 border-primary-200 dark:border-primary-800">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled={filteredStudents.length <= 10}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      <AddStudentModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
