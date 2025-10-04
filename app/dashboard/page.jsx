"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { rtdb, auth } from "@/lib/firebase";
import { ref, set, onValue, remove, update, get } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Briefcase,
  Edit,
  Save,
  Trash2,
  X as XIcon,
  LogOut,
  FileText,
  Plus
} from "lucide-react";

function cls(...c) { return c.filter(Boolean).join(" "); }

export default function UnifiedDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [enrollmentMode, setEnrollmentMode] = useState(false);
  const [enrollmentID, setEnrollmentID] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState({});
  
  // Get current date in LOCAL timezone, not UTC
  const getCurrentLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [currentDate, setCurrentDate] = useState(() => getCurrentLocalDate());

  // Check if date has changed (runs every minute)
  useEffect(() => {
    const checkDateChange = () => {
      const newDate = getCurrentLocalDate();
      console.log(`Current date check: ${newDate}, Stored date: ${currentDate}`);
      if (newDate !== currentDate) {
        console.log(`🔄 Date changed from ${currentDate} to ${newDate}`);
        setCurrentDate(newDate);
        // Force refresh of attendance data
        setTodayAttendance({});
      }
    };

    // Check immediately on mount
    checkDateChange();
    
    // Check every minute if the date has changed
    const interval = setInterval(checkDateChange, 60000);
    
    // Also schedule a check at midnight
    const scheduleMidnightCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 10, 0); // 10 seconds after midnight
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        console.log("Midnight check triggered");
        checkDateChange();
        // Schedule next midnight check
        scheduleMidnightCheck();
      }, timeUntilMidnight);
    };
    
    const midnightTimeout = scheduleMidnightCheck();
    
    return () => {
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
  }, [currentDate]);

  // Auth protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin-login");
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== "admin") {
          await signOut(auth);
          router.push("/admin-login");
          return;
        }
        setCurrentUser(user);
        setAuthChecked(true);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/admin-login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin-login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Subscribe to employees from RTDB
  useEffect(() => {
    if (!authChecked || !currentUser) return;
    
    const employeesRef = ref(rtdb, "employees");
    const unsub = onValue(employeesRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, emp]) => ({
        id,
        ...emp,
        enrollmentStatus: emp.fingerprint_enrolled === "true" ? "enrolled" : "pending"
      }));
      setEmployees(list);
      setLoading(false);
    });
    return () => unsub();
  }, [authChecked, currentUser]);

  // Auto-close previous day's attendance for employees who didn't check out
  // This runs at midnight or when dashboard loads with unclosed previous day records
  useEffect(() => {
    if (!authChecked || !currentUser) return;
    
    const autoClosePreviousDaysAttendance = async () => {
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayKey = `${year}${month}${day}`; // Format: 20251003 in LOCAL timezone
        
        console.log(`🔍 Checking for unclosed attendance records. Today is: ${todayKey} (Local: ${year}-${month}-${day})`);
        
        const attendanceRef = ref(rtdb, "attendance");
        const snapshot = await get(attendanceRef);
        const data = snapshot.val() || {};
        
        if (!data || Object.keys(data).length === 0) {
          console.log("No attendance data found in database");
          return;
        }
        
        // Check each employee's attendance for all previous days
        const updates = {};
        let foundRecords = 0;
        
        Object.entries(data).forEach(([empId, records]) => {
          if (!records) return;
          
          Object.entries(records).forEach(([dateKey, record]) => {
            // Only process dates before today
            if (dateKey < todayKey) {
              foundRecords++;
              
              // Check both field name patterns: 'in'/'out' AND 'checkIn'/'checkOut'
              const hasCheckIn = record.in || record.checkIn;
              const hasCheckOut = record.out || record.checkOut;
              const isAutoClosed = record.autoClosedBySystem;
              
              console.log(`Checking employee ${empId} on ${dateKey}: in=${record.in}, out=${record.out}, checkIn=${record.checkIn}, checkOut=${record.checkOut}, autoClosedBySystem=${isAutoClosed}`);
              
              // If checked in but no checkout time and not already auto-closed
              if (hasCheckIn && !hasCheckOut && !isAutoClosed) {
                // Set checkout to end of that day (23:59:59)
                const checkOutTime = "23:59:59";
                
                // Use the same field name pattern that exists in the record
                if (record.in) {
                  updates[`attendance/${empId}/${dateKey}/out`] = checkOutTime;
                } else if (record.checkIn) {
                  updates[`attendance/${empId}/${dateKey}/checkOut`] = checkOutTime;
                }
                updates[`attendance/${empId}/${dateKey}/autoClosedBySystem`] = true;
                console.log(`✅ Auto-closing attendance for employee ${empId} on ${dateKey} with checkout time ${checkOutTime}`);
              }
            }
          });
        });
        
        console.log(`Found ${foundRecords} previous day records, ${Object.keys(updates).length / 2} need auto-closing`);
        
        // Apply all updates at once
        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb), updates);
          console.log(`✅ Successfully auto-closed ${Object.keys(updates).length / 2} attendance records from previous days`);
        } else {
          console.log("No unclosed attendance records found that need auto-closing");
        }
      } catch (error) {
        console.error("❌ Error auto-closing previous days attendance:", error);
      }
    };
    
    // Run on dashboard load and when date changes
    autoClosePreviousDaysAttendance();
  }, [authChecked, currentUser, currentDate]);

  // Subscribe to today's attendance for all employees
  useEffect(() => {
    if (!authChecked || !currentUser) return;
    
    const todayKey = currentDate.replace(/-/g, ''); // Use currentDate state, Format: 20251003
    const attendanceRef = ref(rtdb, "attendance");
    
    console.log(`📊 Subscribing to attendance data for date: ${todayKey} (${currentDate})`);
    
    const unsub = onValue(attendanceRef, (snap) => {
      const data = snap.val() || {};
      const todayData = {};
      
      Object.entries(data).forEach(([empId, records]) => {
        if (records[todayKey]) {
          const record = records[todayKey];
          // Normalize field names: support both 'in'/'out' AND 'checkIn'/'checkOut'
          todayData[empId] = {
            checkIn: record.checkIn || record.in,
            checkOut: record.checkOut || record.out,
            autoClosedBySystem: record.autoClosedBySystem
          };
          console.log(`Found attendance for employee ${empId} on ${todayKey}:`, todayData[empId]);
        }
      });
      
      console.log(`📈 Today's attendance count: ${Object.keys(todayData).length} employees`);
      setTodayAttendance(todayData);
    });
    
    return () => unsub();
  }, [authChecked, currentUser, currentDate]);

  // Subscribe to enrollment mode and ID
  useEffect(() => {
    if (!authChecked || !currentUser) return;
    
    const modeRef = ref(rtdb, "enrollmentMode");
    const idRef = ref(rtdb, "enrollmentID");
    
    const unsubMode = onValue(modeRef, (snap) => {
      setEnrollmentMode(snap.val() || false);
    });
    
    const unsubID = onValue(idRef, (snap) => {
      setEnrollmentID(snap.val() || null);
    });
    
    return () => {
      unsubMode();
      unsubID();
    };
  }, [authChecked, currentUser]);

  // Don't render dashboard until auth is checked
  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Employee Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage employees, track enrollment, and view individual reports
              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono">
                Tracking: {currentDate} ({currentDate.replace(/-/g, '')})
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Add Employee Form */}
        {showAddForm && (
          <AddEmployeeForm 
            onSuccess={() => setShowAddForm(false)} 
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Enrollment Status Banner */}
        {enrollmentMode && enrollmentID && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 backdrop-blur shadow-sm p-3 sm:p-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="animate-pulse h-3 w-3 rounded-full bg-indigo-600 flex-shrink-0 mt-1 sm:mt-0"></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-indigo-900 text-sm sm:text-base">Enrollment in Progress</h3>
                <p className="text-xs sm:text-sm text-indigo-700 break-words">
                  Enrolling employee ID: <span className="font-mono font-medium">{enrollmentID}</span> - Place finger on sensor now
                </p>
              </div>
              <AlertCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard 
            icon={Users} 
            label="Total Employees" 
            value={employees.length}
            color="indigo"
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Enrolled" 
            value={employees.filter(e => e.enrollmentStatus === "enrolled").length}
            color="green"
          />
          <StatCard 
            icon={Clock} 
            label="Present Today" 
            value={Object.keys(todayAttendance).length}
            color="blue"
          />
          <StatCard 
            icon={Calendar} 
            label="Today" 
            value={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            color="gray"
          />
        </div>

        {/* Employee List or Individual Report */}
        {selectedEmployee ? (
          <IndividualReport 
            employee={selectedEmployee} 
            onClose={() => setSelectedEmployee(null)}
          />
        ) : (
          <EmployeeList 
            employees={employees}
            todayAttendance={todayAttendance}
            onSelectEmployee={setSelectedEmployee}
            onEditEmployee={setEditingEmployee}
            onDeleteEmployee={setDeletingEmployee}
            loading={loading}
          />
        )}

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <EditEmployeeModal
            employee={editingEmployee}
            onClose={() => setEditingEmployee(null)}
            onSuccess={() => setEditingEmployee(null)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingEmployee && (
          <DeleteConfirmationModal
            employee={deletingEmployee}
            onClose={() => setDeletingEmployee(null)}
            onSuccess={() => setDeletingEmployee(null)}
          />
        )}
      </div>
    </div>
  );
}

// Add Employee Form Component
function AddEmployeeForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    employeeId: "",
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    maxHalfDayCutMinutes: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!/^[-_a-zA-Z0-9]{3,}$/.test(form.employeeId)) {
        throw new Error("Employee ID must be at least 3 chars (alphanumeric, dash, underscore)");
      }
      
      // Check if employee already exists
      const employeeRef = ref(rtdb, `employees/${form.employeeId}`);
      const existing = await get(employeeRef);
      if (existing.exists()) {
        throw new Error("Employee ID already exists");
      }
      
      // Add employee to RTDB
      await set(employeeRef, {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        maxHalfDayCutMinutes: Number(form.maxHalfDayCutMinutes),
        joined: new Date().toISOString().split('T')[0],
        fingerprint_enrolled: "false",
      });
      
      // Set enrollment mode and ID to trigger ESP32
      await set(ref(rtdb, "enrollmentMode"), true);
      await set(ref(rtdb, "enrollmentID"), form.employeeId);
      
      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Add New Employee</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="employeeId" className="text-sm">Employee ID *</Label>
          <Input 
            id="employeeId" 
            name="employeeId" 
            value={form.employeeId} 
            onChange={onChange} 
            required 
            placeholder="e.g. E1001"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="name" className="text-sm">Full Name *</Label>
          <Input 
            id="name" 
            name="name" 
            value={form.name} 
            onChange={onChange} 
            required 
            placeholder="Jane Doe"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="startTime" className="text-sm">Start Time *</Label>
          <Input 
            id="startTime" 
            type="time"
            name="startTime" 
            value={form.startTime} 
            onChange={onChange} 
            required
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="endTime" className="text-sm">End Time *</Label>
          <Input 
            id="endTime" 
            type="time"
            name="endTime" 
            value={form.endTime} 
            onChange={onChange} 
            required
            className="text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="maxHalfDayCutMinutes" className="text-sm">Max Half-Day Cut (minutes late) *</Label>
          <Input 
            id="maxHalfDayCutMinutes" 
            type="number"
            name="maxHalfDayCutMinutes" 
            value={form.maxHalfDayCutMinutes} 
            onChange={onChange} 
            required 
            min="0"
            placeholder="e.g. 120 (2 hours)"
            className="text-sm"
          />
        </div>
        {error && (
          <div className="sm:col-span-2 text-xs sm:text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Adding..." : "Add & Enroll"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// Employee List Component
function EmployeeList({ employees, todayAttendance, onSelectEmployee, onEditEmployee, onDeleteEmployee, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading employees...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-12 text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No employees yet. Add your first employee to get started.</p>
      </div>
    );
  }

  function calculateAttendanceStatus(emp) {
    const attendance = todayAttendance[emp.id];
    if (!attendance || !attendance.checkIn) {
      return { status: "absent", label: "Absent", color: "red", time: null };
    }

    const inTime = attendance.checkIn; // Format: "17:45:36"
    const outTime = attendance.checkOut;

    // Calculate if late
    const startTime = emp.startTime || "09:00";
    const maxLateMins = emp.maxHalfDayCutMinutes || 120;
    
    const [inHour, inMin] = inTime.split(":").map(Number);
    const [startHour, startMin] = startTime.split(":").map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const startMinutes = startHour * 60 + startMin;
    const lateMinutes = inMinutes - startMinutes;

    if (lateMinutes > maxLateMins) {
      return { 
        status: "halfday", 
        label: "Half Day", 
        color: "amber", 
        time: { in: inTime, out: outTime },
        late: lateMinutes
      };
    }

    return { 
      status: "present", 
      label: "Present", 
      color: "green", 
      time: { in: inTime, out: outTime },
      late: lateMinutes > 0 ? lateMinutes : 0
    };
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white/60">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Employees ({employees.length})</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {employees.map((emp) => {
          const enrollStatus = emp.fingerprint_enrolled === "true" ? "enrolled" : "pending";
          const attendanceStatus = calculateAttendanceStatus(emp);
          
          return (
            <div
              key={emp.id}
              className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-indigo-50/50 transition-colors"
            >
              {/* Mobile Layout */}
              <div className="block lg:hidden space-y-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => onSelectEmployee(emp)}
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-semibold text-sm sm:text-base">
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{emp.name}</h3>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <span className="truncate">ID: {emp.id}</span>
                      {emp.device_slot && (
                        <>
                          <span>•</span>
                          <span>Slot: {emp.device_slot}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <AttendanceBadge status={attendanceStatus.status} label={attendanceStatus.label} />
                    <EnrollmentBadge status={enrollStatus} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEmployee(emp);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEmployee(emp);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {attendanceStatus.time && (
                  <div className="text-xs text-gray-500 pl-13">
                    In: {attendanceStatus.time.in}
                    {attendanceStatus.time.out && (
                      <> • Out: {attendanceStatus.time.out}</>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex items-center justify-between">
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => onSelectEmployee(emp)}
                >
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-semibold">
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{emp.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>ID: {emp.id}</span>
                      {emp.device_slot && (
                        <>
                          <span>•</span>
                          <span>Slot: {emp.device_slot}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm min-w-[120px]">
                    <div className="text-gray-600">
                      {emp.startTime || "09:00"} - {emp.endTime || "17:00"}
                    </div>
                    <div className="text-gray-500">
                      Late: {emp.maxHalfDayCutMinutes || 120} min
                    </div>
                  </div>
                  
                  {/* Today's Attendance Status */}
                  <div className="text-right text-sm min-w-[100px]">
                    <AttendanceBadge status={attendanceStatus.status} label={attendanceStatus.label} />
                    {attendanceStatus.time && (
                      <div className="text-xs text-gray-500 mt-1">
                        In: {attendanceStatus.time.in}
                        {attendanceStatus.time.out && (
                          <> | Out: {attendanceStatus.time.out}</>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <EnrollmentBadge status={enrollStatus} />
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEmployee(emp);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEmployee(emp);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Enrollment Status Badge
function EnrollmentBadge({ status }) {
  const variants = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", icon: Clock },
    success: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200", icon: CheckCircle2 },
    enrolled: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200", icon: CheckCircle2 },
    failed: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", icon: XCircle },
  };
  const variant = variants[status] || variants.pending;
  const Icon = variant.icon;
  
  return (
    <span className={cls(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ring-1",
      variant.bg, variant.text, variant.ring
    )}>
      <Icon className="h-3.5 w-3.5" />
      {status || "pending"}
    </span>
  );
}

// Attendance Status Badge
function AttendanceBadge({ status, label }) {
  const variants = {
    present: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200" },
    halfday: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
    absent: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
  };
  const variant = variants[status] || variants.absent;
  
  return (
    <span className={cls(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ring-1",
      variant.bg, variant.text, variant.ring
    )}>
      {label}
    </span>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    green: "bg-green-50 text-green-700 ring-green-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    gray: "bg-gray-50 text-gray-700 ring-gray-200",
  };
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-3 sm:p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{value}</p>
        </div>
        <div className={cls("h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center ring-1 flex-shrink-0", colors[color])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}

// Individual Report Component
function IndividualReport({ employee, onClose }) {
  const [view, setView] = useState("today"); // today | month | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [customStats, setCustomStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendanceData();
  }, [employee.id, view, customStart, customEnd]);

  async function loadAttendanceData() {
    setLoading(true);
    try {
      // Get today's date in LOCAL timezone
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}${month}${day}`; // Format: 20251003 in LOCAL timezone
      
      console.log(`IndividualReport: Fetching attendance for employee ${employee.id} on ${today} (${year}-${month}-${day})`);
      
      // Always fetch today's attendance from RTDB
      const todayRef = ref(rtdb, `attendance/${employee.id}/${today}`);
      const todaySnap = await get(todayRef);
      
      if (todaySnap.exists()) {
        const record = todaySnap.val();
        // Normalize field names: support both 'in'/'out' AND 'checkIn'/'checkOut'
        const normalizedData = {
          checkIn: record.checkIn || record.in,
          checkOut: record.checkOut || record.out,
          autoClosedBySystem: record.autoClosedBySystem
        };
        console.log(`Found attendance for ${employee.id} on ${today}:`, normalizedData);
        setTodayAttendance(normalizedData);
      } else {
        console.log(`No attendance found for ${employee.id} on ${today}`);
        setTodayAttendance(null);
      }
      
      if (view === "month") {
        await loadMonthlyData();
      } else if (view === "custom" && customStart && customEnd) {
        await loadCustomRangeData();
      }
    } catch (e) {
      console.error("Error loading attendance data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyData() {
    // Get current month's attendance records from RTDB
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const startDate = `${year}${month}01`;
    const endDate = `${year}${month}${new Date(year, now.getMonth() + 1, 0).getDate()}`;
    
    const records = await fetchAttendanceRange(employee.id, startDate, endDate);
    setAttendanceRecords(records);
    
    const stats = calculateStats(records, startDate, endDate);
    setMonthlyStats(stats);
  }

  async function loadCustomRangeData() {
    const start = customStart.replace(/-/g, '');
    const end = customEnd.replace(/-/g, '');
    const records = await fetchAttendanceRange(employee.id, start, end);
    setAttendanceRecords(records);
    
    const stats = calculateStats(records, start, end);
    setCustomStats(stats);
  }

  async function fetchAttendanceRange(empId, startDate, endDate) {
    // Fetch attendance records from RTDB
    const attendanceRef = ref(rtdb, `attendance/${empId}`);
    const snap = await get(attendanceRef);
    
    if (!snap.exists()) return [];
    
    const data = snap.val();
    const records = Object.entries(data)
      .filter(([date]) => date >= startDate && date <= endDate)
      .map(([date, record]) => ({
        date: formatDateFromRTDB(date),
        ...record
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return records;
  }

  function formatDateFromRTDB(dateStr) {
    // Convert 20251002 to 2025-10-02
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  }

  function calculateStats(records, startDate, endDate) {
    const totalWorkingDays = getWorkingDaysCount(
      formatDateFromRTDB(startDate), 
      formatDateFromRTDB(endDate)
    );
    
    // Calculate half days based on late threshold
    const startTime = employee.startTime || "09:00";
    const maxLateMins = employee.maxHalfDayCutMinutes || 120;
    
    let halfDays = 0;
    let fullDays = 0;
    
    records.forEach(record => {
      if (record.in) {
        const [inHour, inMin] = record.in.split(":").map(Number);
        const [startHour, startMin] = startTime.split(":").map(Number);
        
        const inMinutes = inHour * 60 + inMin;
        const startMinutes = startHour * 60 + startMin;
        const lateMinutes = inMinutes - startMinutes;
        
        if (lateMinutes > maxLateMins) {
          halfDays++;
        } else {
          fullDays++;
        }
      }
    });
    
    const presentDays = records.filter(r => r.in).length;
    const fullDayLeaves = totalWorkingDays - presentDays;
    
    return {
      totalDays: totalWorkingDays,
      presentDays,
      fullDays,
      halfDays,
      fullDayLeaves,
      records,
    };
  }

  function getWorkingDaysCount(start, end) {
    // Count all days in the range (including Sundays)
    const startD = new Date(start);
    const endD = new Date(end);
    let count = 0;
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      count++; // Count all days
    }
    return count;
  }

  function formatTime(timeValue) {
    if (!timeValue) return "--";
    return timeValue; // Already in HH:MM:SS format from RTDB
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition flex-shrink-0"
          >
            ←
          </button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{employee.name}</h2>
            <p className="text-sm sm:text-base text-gray-600">ID: {employee.employeeID || employee.id}</p>
          </div>
        </div>
        <EnrollmentBadge status={employee.enrollmentStatus} />
      </div>

      {/* View Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
        <Button
          onClick={() => setView("today")}
          variant={view === "today" ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
        >
          Today
        </Button>
        <Button
          onClick={() => setView("month")}
          variant={view === "month" ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
        >
          This Month
        </Button>
        <Button
          onClick={() => setView("custom")}
          variant={view === "custom" ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
        >
          Custom Range
        </Button>
      </div>

      {/* Custom Date Range Selector */}
      {view === "custom" && (
        <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
          <div className="flex-1">
            <Label htmlFor="customStart" className="text-sm">Start Date</Label>
            <Input
              id="customStart"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="customEnd" className="text-sm">End Date</Label>
            <Input
              id="customEnd"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              min={customStart}
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Today's Status */}
      {view === "today" && (
        <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            <span className="truncate">Today's Attendance ({new Date().toLocaleDateString()})</span>
          </h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : todayAttendance ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Status</p>
                  <p className="text-base sm:text-lg font-semibold text-green-600">Present</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Check In</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {formatTime(todayAttendance.checkIn)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Check Out</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(todayAttendance.checkOut)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Half-Day</p>
                  {(() => {
                    // Calculate half-day status based on late minutes
                    if (!todayAttendance.checkIn) return <p className="text-lg font-semibold text-gray-400">No</p>;
                    
                    const startTime = employee.startTime || "09:00";
                    const maxLateMins = employee.maxHalfDayCutMinutes || 120;
                    const [inHour, inMin] = todayAttendance.checkIn.split(":").map(Number);
                    const [startHour, startMin] = startTime.split(":").map(Number);
                    const inMinutes = inHour * 60 + inMin;
                    const startMinutes = startHour * 60 + startMin;
                    const lateMinutes = inMinutes - startMinutes;
                    const isHalfDay = lateMinutes > maxLateMins;
                    
                    return (
                      <p className={cls(
                        "text-lg font-semibold",
                        isHalfDay ? "text-amber-600" : "text-gray-400"
                      )}>
                        {isHalfDay ? "Yes" : "No"}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No attendance recorded today</p>
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary */}
      {view === "month" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              This Month Summary
            </h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : monthlyStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatBox label="Working Days" value={monthlyStats.totalDays} color="gray" />
                <StatBox label="Present" value={monthlyStats.presentDays} color="blue" />
                <StatBox label="Full Days" value={monthlyStats.fullDays} color="green" />
                <StatBox label="Half Days" value={monthlyStats.halfDays} color="amber" />
                <StatBox label="Absents" value={monthlyStats.fullDayLeaves} color="red" />
              </div>
            ) : null}
          </div>

          {/* Detailed Records */}
          <AttendanceRecordsList records={attendanceRecords} loading={loading} employee={employee} />
        </div>
      )}

      {/* Custom Range Summary */}
      {view === "custom" && customStart && customEnd && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Custom Range: {customStart} to {customEnd}
            </h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : customStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatBox label="Working Days" value={customStats.totalDays} color="gray" />
                <StatBox label="Present" value={customStats.presentDays} color="blue" />
                <StatBox label="Full Days" value={customStats.fullDays} color="green" />
                <StatBox label="Half Days" value={customStats.halfDays} color="amber" />
                <StatBox label="Absents" value={customStats.fullDayLeaves} color="red" />
              </div>
            ) : null}
          </div>

          <AttendanceRecordsList records={attendanceRecords} loading={loading} employee={employee} />
        </div>
      )}
    </div>
  );
}

// Stat Box Component for Reports
function StatBox({ label, value, color }) {
  const colors = {
    gray: "text-gray-900",
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={cls("text-3xl font-bold", colors[color])}>{value}</p>
    </div>
  );
}

// Attendance Records List Component with Notes
function AttendanceRecordsList({ records, loading, employee }) {
  const [notes, setNotes] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (records && records.length > 0) {
      loadNotesForRecords();
    }
  }, [records, employee.id]);

  async function loadNotesForRecords() {
    try {
      const notesData = {};
      for (const record of records) {
        const noteRef = doc(db, "attendance_notes", `${employee.id}_${record.date}`);
        const noteSnap = await getDoc(noteRef);
        if (noteSnap.exists()) {
          notesData[record.date] = noteSnap.data().note;
        }
      }
      setNotes(notesData);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  }

  async function handleSaveNote(date) {
    if (!noteText.trim() && !notes[date]) return;
    
    setSavingNote(true);
    try {
      const noteRef = doc(db, "attendance_notes", `${employee.id}_${date}`);
      
      if (noteText.trim()) {
        await setDoc(noteRef, {
          employeeId: employee.id,
          date: date,
          note: noteText.trim(),
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.uid || "unknown"
        });
        setNotes({ ...notes, [date]: noteText.trim() });
      } else {
        // If empty, we're deleting the note
        await setDoc(noteRef, {
          employeeId: employee.id,
          date: date,
          note: "",
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.uid || "unknown"
        });
        const newNotes = { ...notes };
        delete newNotes[date];
        setNotes(newNotes);
      }
      
      setEditingNote(null);
      setNoteText("");
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  }

  function handleEditNote(date) {
    setEditingNote(date);
    setNoteText(notes[date] || "");
  }

  function handleCancelEdit() {
    setEditingNote(null);
    setNoteText("");
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-4 sm:p-6 text-center">
        <p className="text-sm sm:text-base text-gray-500">Loading records...</p>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-4 sm:p-6 text-center">
        <p className="text-sm sm:text-base text-gray-500">No attendance records in this period</p>
      </div>
    );
  }

  function formatTime(timeValue) {
    if (!timeValue) return "--";
    return timeValue; // Already in HH:MM:SS format from RTDB
  }

  function isHalfDay(record) {
    if (!record.in || !employee) return false;
    
    const startTime = employee.startTime || "09:00";
    const maxLateMins = employee.maxHalfDayCutMinutes || 120;
    
    const [inHour, inMin] = record.in.split(":").map(Number);
    const [startHour, startMin] = startTime.split(":").map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const startMinutes = startHour * 60 + startMin;
    const lateMinutes = inMinutes - startMinutes;
    
    return lateMinutes > maxLateMins;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white/60">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900">Daily Records ({records.length})</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[32rem] overflow-y-auto">
        {records.map((record) => {
          const halfDay = isHalfDay(record);
          const hasNote = notes[record.date];
          const isEditing = editingNote === record.date;
          
          return (
            <div key={record.date} className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-indigo-50/30 transition-colors">
              {/* Mobile Layout */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(record.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex gap-1.5">
                    {halfDay && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        Half Day
                      </span>
                    )}
                    {!halfDay && record.in && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                        Full Day
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-4 text-sm">
                  <div className="flex-1">
                    <span className="text-gray-600 text-xs">In: </span>
                    <span className="font-medium text-gray-900 text-sm">
                      {formatTime(record.in)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-600 text-xs">Out: </span>
                    <span className="font-medium text-gray-900 text-sm">
                      {formatTime(record.out)}
                    </span>
                  </div>
                </div>

                {/* Note Section - Mobile */}
                <div className="pt-2 border-t border-gray-100">
                  {!isEditing ? (
                    <div className="space-y-2">
                      {hasNote && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2">
                          <div className="flex items-start gap-2">
                            <FileText className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-700 flex-1 break-words">{notes[record.date]}</p>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleEditNote(record.date)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                      >
                        {hasNote ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {hasNote ? "Edit Note" : "Add Note"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note for this day..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                        rows={3}
                        disabled={savingNote}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveNote(record.date)}
                          disabled={savingNote}
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
                        >
                          {savingNote ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          disabled={savingNote}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="text-sm font-medium text-gray-900 min-w-[120px]">
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">In: </span>
                        <span className="font-medium text-gray-900">
                          {formatTime(record.in)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Out: </span>
                        <span className="font-medium text-gray-900">
                          {formatTime(record.out)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isEditing && (
                      <button
                        onClick={() => handleEditNote(record.date)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={hasNote ? "Edit note" : "Add note"}
                      >
                        {hasNote ? <Edit className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {hasNote ? "Edit" : "Note"}
                      </button>
                    )}
                    {halfDay && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        Half Day
                      </span>
                    )}
                    {!halfDay && record.in && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                        Full Day
                      </span>
                    )}
                  </div>
                </div>

                {/* Note Section - Desktop */}
                {(hasNote || isEditing) && (
                  <div className="ml-[120px] mr-[180px]">
                    {!isEditing ? (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 flex-1">{notes[record.date]}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note for this day..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                          rows={3}
                          disabled={savingNote}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveNote(record.date)}
                            disabled={savingNote}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {savingNote ? "Saving..." : "Save Note"}
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            disabled={savingNote}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Edit Employee Modal Component
function EditEmployeeModal({ employee, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: employee.name || "",
    startTime: employee.startTime || "09:00",
    endTime: employee.endTime || "17:00",
    maxHalfDayCutMinutes: employee.maxHalfDayCutMinutes || 120,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const employeeRef = ref(rtdb, `employees/${employee.id}`);
      
      await update(employeeRef, {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        maxHalfDayCutMinutes: Number(form.maxHalfDayCutMinutes),
      });
      
      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Employee</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="employeeId" className="text-sm">Employee ID</Label>
            <Input 
              id="employeeId" 
              value={employee.id} 
              disabled 
              className="bg-gray-100 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="name" className="text-sm">Full Name *</Label>
            <Input 
              id="name" 
              name="name" 
              value={form.name} 
              onChange={onChange} 
              required 
              placeholder="Jane Doe"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="deviceSlot" className="text-sm">Device Slot</Label>
            <Input 
              id="deviceSlot" 
              value={employee.device_slot || "Not assigned"} 
              disabled 
              className="bg-gray-100 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="startTime" className="text-sm">Start Time *</Label>
            <Input 
              id="startTime" 
              type="time"
              name="startTime" 
              value={form.startTime} 
              onChange={onChange} 
              required
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="endTime" className="text-sm">End Time *</Label>
            <Input 
              id="endTime" 
              type="time"
              name="endTime" 
              value={form.endTime} 
              onChange={onChange} 
              required
              className="text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="maxHalfDayCutMinutes" className="text-sm">Max Half-Day Cut (minutes late) *</Label>
            <Input 
              id="maxHalfDayCutMinutes" 
              type="number"
              name="maxHalfDayCutMinutes" 
              value={form.maxHalfDayCutMinutes} 
              onChange={onChange} 
              required
              className="text-sm" 
              min="0"
              placeholder="e.g. 120 (2 hours)"
            />
          </div>
          {employee.enrolled_at && (
            <div className="sm:col-span-2">
              <Label className="text-sm">Enrolled At</Label>
              <Input 
                value={employee.enrolled_at} 
                disabled 
                className="bg-gray-100 text-sm"
              />
            </div>
          )}
          {error && (
            <div className="sm:col-span-2 text-xs sm:text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ employee, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      // Get device slot before deletion
      const deviceSlot = employee.device_slot;
      
      // Delete employee from RTDB
      const employeeRef = ref(rtdb, `employees/${employee.id}`);
      await remove(employeeRef);
      
      // Also delete their attendance records
      const attendanceRef = ref(rtdb, `attendance/${employee.id}`);
      await remove(attendanceRef);
      
      // Free the device mapping slot if it exists
      if (deviceSlot) {
        const deviceMappingRef = ref(rtdb, `deviceMapping/${deviceSlot}`);
        await remove(deviceMappingRef);
      }
      
      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to delete employee");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-red-600">Delete Employee</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200 mb-3 sm:mb-4">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-red-900">Warning: This action cannot be undone!</p>
              <p className="text-xs sm:text-sm text-red-700 mt-1">
                All attendance records will also be permanently deleted.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">You are about to delete:</p>
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{employee.name}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">ID: {employee.id}</p>
              {employee.device_slot && (
                <p className="text-xs sm:text-sm text-gray-600">Device Slot: {employee.device_slot}</p>
              )}
              {employee.fingerprint_enrolled === "true" && (
                <p className="text-xs sm:text-sm text-green-600">✓ Fingerprint Enrolled</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-red-600 flex items-start gap-2 p-2 sm:p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loading ? "Deleting..." : "Delete Permanently"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
