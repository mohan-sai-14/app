import { 
  users, 
  sessions, 
  attendance, 
  type User, 
  type InsertUser, 
  type Session, 
  type InsertSession, 
  type Attendance, 
  type InsertAttendance 
} from "@shared/schema";
import { supabase } from '@shared/supabase';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getActiveSession(): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  expireSession(id: number): Promise<boolean>;

  // Attendance operations
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceBySession(sessionId: number): Promise<Attendance[]>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceBySessionAndUser(sessionId: number, userId: number): Promise<Attendance | undefined>;
  getAllAttendance(): Promise<Attendance[]>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const { data } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase
      .from('users')
      .select()
      .eq('username', username)
      .single();
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const { data } = await supabase
      .from('users')
      .update(user)
      .eq('id', id)
      .select()
      .single();
    return data || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    return !error;
  }

  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase
      .from('users')
      .select();
    return data || [];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const { data } = await supabase
      .from('users')
      .select()
      .eq('role', role);
    return data || [];
  }

  async createSession(session: Partial<Session>): Promise<Session> {
    try {
      console.log("Creating new session:", session.name);
      
      // Deactivate any currently active sessions first
      await this.deactivateAllSessions();
      
      // Format session data with correct field names for Supabase
      const formattedSession = {
        name: session.name,
        date: session.date,
        time: session.time,
        duration: session.duration,
        qr_code: session.qrCode || session.qr_code,
        expires_at: session.expiresAt || session.expires_at,
        is_active: true, // Always create as active
        created_at: new Date().toISOString()
      };
      
      console.log("Formatted session data:", formattedSession);
      
      const { data, error } = await supabase
        .from('sessions')
        .insert(formattedSession)
        .select()
        .single();
      
      if (error) {
        console.error("Error creating session:", error);
        throw error;
      }
      
      console.log("Successfully created session:", data.id);
      return data;
    } catch (error) {
      console.error("Exception in createSession:", error);
      throw error;
    }
  }
  
  // Add a helper method to deactivate all sessions
  async deactivateAllSessions(): Promise<void> {
    try {
      console.log("Deactivating all active sessions...");
      
      const { data: activeSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true);
      
      if (fetchError) {
        console.error("Error fetching active sessions to deactivate:", fetchError);
        throw fetchError;
      }
      
      if (!activeSessions || activeSessions.length === 0) {
        console.log("No active sessions to deactivate");
        return;
      }
      
      console.log(`Found ${activeSessions.length} active sessions to deactivate`);
      
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ is_active: false })
        .in('id', activeSessions.map(s => s.id));
      
      if (updateError) {
        console.error("Error deactivating sessions:", updateError);
        throw updateError;
      }
      
      console.log("Successfully deactivated all active sessions");
    } catch (error) {
      console.error("Exception in deactivateAllSessions:", error);
      throw error;
    }
  }

  async getSession(id: number): Promise<Session | undefined> {
    const { data } = await supabase
      .from('sessions')
      .select()
      .eq('id', id)
      .single();
    
    if (!data) return undefined;
    
    // Check if session has expired
    const expiryTime = new Date(data.expires_at).getTime();
    const currentTime = Date.now();
    
    if (currentTime > expiryTime && data.is_active) {
      // Automatically deactivate expired sessions
      await this.expireSession(data.id);
      return { ...data, is_active: false };
    }
    
    return data;
  }

  async getActiveSession(): Promise<Session | undefined> {
    try {
      console.log("Fetching active session...");
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No active session found - this is normal
          console.log("No active session found");
          return undefined;
        }
        console.error("Error fetching active session:", error);
        throw error;
      }
      
      if (!data) {
        console.log("No active session data returned");
        return undefined;
      }
      
      console.log("Active session found:", data.id, data.name, "expires_at:", data.expires_at);
      
      // Check if the session has expired
      const expiryTime = new Date(data.expires_at).getTime();
      const currentTime = Date.now();
      
      if (currentTime > expiryTime) {
        console.log(`Session ${data.id} has expired at ${new Date(expiryTime).toISOString()}, current time: ${new Date(currentTime).toISOString()}`);
        
        // Automatically expire the session
        await this.expireSession(data.id);
        console.log(`Session ${data.id} marked as expired`);
        
        return undefined;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getActiveSession:", error);
      throw error;
    }
  }

  async getAllSessions(): Promise<Session[]> {
    const { data } = await supabase
      .from('sessions')
      .select();
    return data || [];
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined> {
    const { data } = await supabase
      .from('sessions')
      .update(session)
      .eq('id', id)
      .select()
      .single();
    return data || undefined;
  }

  async deleteSession(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    return !error;
  }

  async expireSession(sessionId: number): Promise<boolean> {
    try {
      console.log(`Expiring session ${sessionId}...`);
      
      // First, get the session to check if it exists
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error(`Error finding session ${sessionId} to expire:`, sessionError);
        return false;
      }
      
      if (!sessionData) {
        console.log(`Session ${sessionId} not found for expiration`);
        return false;
      }
      
      // Update the session to mark it as not active
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) {
        console.error(`Error expiring session ${sessionId}:`, error);
        throw error;
      }
      
      console.log(`Successfully expired session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`Exception in expireSession for ${sessionId}:`, error);
      return false;
    }
  }

  async markAttendance(attendance: InsertAttendance): Promise<Attendance> {
    try {
      // Ensure proper field naming for Supabase
      const formattedAttendance = {
        user_id: attendance.user_id,
        session_id: attendance.session_id,
        check_in_time: attendance.check_in_time,
        status: attendance.status,
        user_name: attendance.user_name || "",
      };
      
      const { data, error } = await supabase
        .from('attendance')
        .insert(formattedAttendance)
        .select()
        .single();
        
      if (error) {
        console.error("Error marking attendance:", error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error("Error in markAttendance:", error);
      throw error;
    }
  }

  async getAttendanceBySession(sessionId: number): Promise<Attendance[]> {
    const { data } = await supabase
      .from('attendance')
      .select()
      .eq('session_id', sessionId);
    return data || [];
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    const { data } = await supabase
      .from('attendance')
      .select()
      .eq('user_id', userId);
    return data || [];
  }

  async getAttendanceBySessionAndUser(sessionId: number, userId: number): Promise<Attendance | undefined> {
    const { data } = await supabase
      .from('attendance')
      .select()
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    return data || undefined;
  }

  async getAllAttendance(): Promise<Attendance[]> {
    const { data } = await supabase
      .from('attendance')
      .select();
    return data || [];
  }
}

export const storage = new SupabaseStorage();