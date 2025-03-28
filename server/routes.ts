import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertSessionSchema, insertAttendanceSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import session from "express-session";
import memorystore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // Configure session storage
  const MemoryStore = memorystore(session);
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
  };
  app.use(session(sessionConfig));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Invalid password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session && req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.session && req.session.userId && req.session.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          req.session.userId = user.id;
          req.session.role = user.role;
          return res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Error destroying session" });
        }
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching user data" });
    }
  });

  // User management routes
  app.get("/api/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    })));
  });

  app.get("/api/users/students", isAdmin, async (req, res) => {
    const students = await storage.getUsersByRole("student");
    res.json(students.map(student => ({
      id: student.id,
      username: student.username,
      name: student.name,
      email: student.email,
      status: student.status
    })));
  });

  app.post("/api/users", isAdmin, async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const success = await storage.deleteUser(userId);
    
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(204).end();
  });

  // Session management routes
  app.post("/api/sessions", isAdmin, async (req, res, next) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      
      // Deactivate any currently active sessions
      const activeSession = await storage.getActiveSession();
      if (activeSession) {
        await storage.expireSession(activeSession.id);
      }
      
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    const sessions = await storage.getAllSessions();
    res.json(sessions);
  });

  app.get("/api/sessions/active", isAuthenticated, async (req, res) => {
    try {
      const activeSession = await storage.getActiveSession();
      
      if (!activeSession) {
        return res.status(404).json({ 
          message: "No active session found. Please wait for an admin to start a new session." 
        });
      }

      // Check if session has expired
      const expiryTime = new Date(activeSession.expires_at).getTime();
      const currentTime = Date.now();
      
      if (currentTime > expiryTime) {
        await storage.expireSession(activeSession.id);
        return res.status(404).json({ 
          message: "The session has expired. Please wait for an admin to start a new session." 
        });
      }
      
      res.json(activeSession);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ 
        message: "Failed to fetch active session. Please try again." 
      });
    }
  });

  app.get("/api/sessions/:id", isAuthenticated, async (req, res) => {
    const sessionId = parseInt(req.params.id);
    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    res.json(session);
  });

  app.put("/api/sessions/:id/expire", isAdmin, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // First get all students
      const students = await storage.getUsersByRole("student");
      
      // Get all students who already marked attendance
      const attendanceRecords = await storage.getAttendanceBySession(sessionId);
      
      // Find students who did not mark attendance (absent)
      const presentStudentIds = attendanceRecords.map(record => record.user_id);
      const absentStudents = students.filter(student => !presentStudentIds.includes(student.id));
      
      // Mark absent students
      for (const student of absentStudents) {
        await storage.markAttendance({
          user_id: student.id,
          session_id: sessionId,
          check_in_time: new Date().toISOString(),
          status: "absent",
          user_name: student.name || ""
        });
      }
      
      // Mark the session as expired
      const success = await storage.expireSession(sessionId);
      
      res.json({ 
        message: "Session expired successfully", 
        absentStudents: absentStudents.length
      });
    } catch (error) {
      console.error("Error expiring session:", error);
      res.status(500).json({ message: "Failed to expire session" });
    }
  });

  app.put("/api/sessions/:id", isAdmin, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.id);
      const sessionData = req.body;
      
      const updatedSession = await storage.updateSession(sessionId, sessionData);
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  });

  // Attendance routes
  app.post("/api/attendance", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { sessionId } = req.body;
      
      // Check if session exists and is active
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (!session.is_active) {
        return res.status(400).json({ message: "Session is not active" });
      }
      
      // Check if session has expired
      const expiryTime = new Date(session.expires_at).getTime();
      const currentTime = Date.now();
      
      if (currentTime > expiryTime) {
        // Automatically deactivate expired sessions
        await storage.expireSession(sessionId);
        return res.status(400).json({ message: "Session has expired" });
      }
      
      // Check if user has already marked attendance for this session
      const existingAttendance = await storage.getAttendanceBySessionAndUser(sessionId, user.id);
      if (existingAttendance) {
        return res.status(409).json({ message: "Attendance already marked for this session" });
      }
      
      // Allow admins to mark attendance for other users
      const userId = req.body.manual && req.session.role === 'admin' ? req.body.userId : user.id;
      
      // Store user details in attendance record
      const attendanceData = {
        user_id: userId,
        session_id: sessionId,
        check_in_time: new Date().toISOString(),
        status: "present",
        user_name: user.name || ""  // Store user name for reference
      };
      
      const attendance = await storage.markAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/attendance/session/:id", isAuthenticated, async (req, res) => {
    const sessionId = parseInt(req.params.id);
    const attendanceRecords = await storage.getAttendanceBySession(sessionId);
    
    // If user is admin, return all records
    if ((req.user as any).role === "admin") {
      return res.json(attendanceRecords);
    }
    
    // If student, only return their own records
    const userAttendance = attendanceRecords.filter(record => record.userId === (req.user as any).id);
    res.json(userAttendance);
  });

  app.get("/api/attendance/user/:id", isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Students can only view their own attendance
    if ((req.user as any).role !== "admin" && (req.user as any).id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const attendanceRecords = await storage.getAttendanceByUser(userId);
    res.json(attendanceRecords);
  });

  app.get("/api/attendance/me", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const attendanceRecords = await storage.getAttendanceByUser(userId);
    
    // Get all sessions to enrich the data
    const sessions = await storage.getAllSessions();
    const sessionsMap = new Map(sessions.map(session => [session.id, session]));
    
    const enrichedRecords = attendanceRecords.map(record => ({
      ...record,
      session: sessionsMap.get(record.sessionId)
    }));
    
    res.json(enrichedRecords);
  });

  // Excel export mock endpoints (in a real app, this would generate actual Excel files)
  app.get("/api/export/attendance/:sessionId", isAdmin, async (req, res) => {
    const sessionId = parseInt(req.params.id);
    res.json({ message: "Excel export functionality would be implemented here" });
  });

  app.get("/api/export/students", isAdmin, async (req, res) => {
    res.json({ message: "Excel export functionality would be implemented here" });
  });
}
