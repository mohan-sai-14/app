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

  async createSession(session: InsertSession): Promise<Session> {
    // Deactivate any currently active sessions
    await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('is_active', true);

    // Create new active session with expiration
    const expirationTime = new Date(Date.now() + session.duration * 60 * 1000);
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        name: session.name,
        date: session.date,
        time: session.time,
        duration: session.duration,
        qr_code: session.qrCode,
        expires_at: expirationTime.toISOString(),
        is_active: true
      })
      .select()
      .single();
    if (error) throw error;
    return data;
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
    const { data } = await supabase
      .from('sessions')
      .select()
      .eq('is_active', true)
      .single();

    if (!data) return undefined;
    
    // Check if session has expired
    const expiryTime = new Date(data.expires_at).getTime();
    const currentTime = Date.now();
    
    if (currentTime > expiryTime) {
      // Automatically deactivate expired sessions
      await this.expireSession(data.id);
      return undefined;
    }
    
    return data;
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

  async expireSession(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', id);
    return !error;
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