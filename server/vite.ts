import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

/**
 * Function to automatically check for expired sessions and mark absent students
 * This will run periodically to ensure all students are properly marked
 */
export async function setupSessionExpirationCheck(storage: any) {
  const checkExpirations = async () => {
    try {
      // Get all sessions that are active
      const sessions = await storage.getAllSessions();
      const activeSessions = sessions.filter(session => session.is_active);
      
      const currentTime = Date.now();
      
      // Check each active session for expiration
      for (const session of activeSessions) {
        const expiryTime = new Date(session.expires_at).getTime();
        
        // If expired, mark as expired and mark absent students
        if (currentTime > expiryTime) {
          console.log(`Session ${session.id} (${session.name}) has expired. Marking absent students...`);
          
          // Get all students
          const students = await storage.getUsersByRole("student");
          
          // Get all students who already marked attendance
          const attendanceRecords = await storage.getAttendanceBySession(session.id);
          
          // Find students who did not mark attendance (absent)
          const presentStudentIds = attendanceRecords.map(record => record.user_id);
          const absentStudents = students.filter(student => !presentStudentIds.includes(student.id));
          
          // Mark absent students
          for (const student of absentStudents) {
            await storage.markAttendance({
              user_id: student.id,
              session_id: session.id,
              check_in_time: new Date().toISOString(),
              status: "absent",
              user_name: student.name || ""
            });
          }
          
          // Mark the session as expired
          await storage.expireSession(session.id);
          
          console.log(`Marked ${absentStudents.length} students as absent for session ${session.id}`);
        }
      }
    } catch (error) {
      console.error("Error checking for expired sessions:", error);
    }
  };
  
  // Run immediately on startup
  await checkExpirations();
  
  // Then run every minute
  setInterval(checkExpirations, 60 * 1000);
}
