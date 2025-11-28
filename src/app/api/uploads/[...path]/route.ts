import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Serve files from the local uploads directory
export async function GET(request: NextRequest, context: any) {
  try {
    const params = context?.params instanceof Promise ? await context.params : context?.params || {};
    const pathSegments: string[] = params?.path || [];
    
    if (pathSegments.length === 0) {
      return NextResponse.json({ error: "No path specified" }, { status: 400 });
    }

    // Sanitize path to prevent directory traversal attacks
    const sanitizedPath = pathSegments
      .map(segment => segment.replace(/\.\./g, "").replace(/[^a-zA-Z0-9_\-\.]/g, "_"))
      .join("/");

    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, sanitizedPath);

    // Security check: ensure the resolved path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(resolvedPath);
    
    // Determine content type based on extension
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("[uploads] Error serving file:", err);
    return NextResponse.json({ error: "Unknown Error" }, { status: 500 });
  }
}