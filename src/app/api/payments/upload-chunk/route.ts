import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function ensureUploadsDir(subDir: string): string {
  const uploadsDir = path.join(process.cwd(), "uploads", subDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export async function POST(req: Request) {
  try {
    const { chunk, fileName, chunkIndex, totalChunks, uploadId } = await req.json();
    
    if (!chunk || !fileName || chunkIndex === undefined || !totalChunks || !uploadId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create temp directory for chunks
    const tempDir = ensureUploadsDir(`temp/${uploadId}`);
    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
    
    // Save chunk
    const buffer = Buffer.from(chunk, 'base64');
    fs.writeFileSync(chunkPath, buffer);
    
    console.log(`[upload-chunk] Saved chunk ${chunkIndex + 1}/${totalChunks} for ${uploadId}`);
    
    // If this is the last chunk, combine all chunks
    if (chunkIndex === totalChunks - 1) {
      const finalDir = ensureUploadsDir("proofs");
      const finalPath = path.join(finalDir, fileName);
      
      // Combine chunks
      const writeStream = fs.createWriteStream(finalPath);
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = fs.readFileSync(path.join(tempDir, `chunk_${i}`));
        writeStream.write(chunkData);
      }
      writeStream.end();
      
      // Clean up temp chunks
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      const fileUrl = `/api/uploads/proofs/${fileName}`;
      console.log(`[upload-chunk] File assembled: ${fileUrl}`);
      
      return NextResponse.json({ 
        success: true, 
        fileUrl,
        message: "Upload complete" 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received` 
    });
    
  } catch (err: any) {
    console.error("[upload-chunk] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}