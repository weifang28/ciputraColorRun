import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  try {
    const params = context?.params instanceof Promise ? await context.params : context?.params || {};
    const id = Number(params?.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });

    const proof = payment.proofOfPayment;
    if (!proof) return NextResponse.json({ error: "no proof stored" }, { status: 404 });

    console.log(`[payments/proof/${id}] ==================== START ====================`);
    console.log(`[payments/proof/${id}] Proof path from DB: "${proof}"`);
    console.log(`[payments/proof/${id}] Current working directory: ${process.cwd()}`);

    // Cloudinary URLs - redirect directly
    if (proof.startsWith("http://") || proof.startsWith("https://")) {
      console.log(`[payments/proof/${id}] Cloudinary URL detected, redirecting`);
      return NextResponse.redirect(proof);
    }

    // Define content types (now includes PDF)
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".pdf": "application/pdf",
    };

    const uploadsDir = path.join(process.cwd(), "uploads");
    console.log(`[payments/proof/${id}] Uploads directory: ${uploadsDir}`);

    let filePath: string | null = null;
    let attemptedPaths: string[] = [];

    // Try multiple path variations to find the file
    const pathVariations = [
      // Modern API path format: /api/uploads/proofs/xxx
      proof.startsWith("/api/uploads/") ? proof.replace("/api/uploads/", "") : null,
      // Legacy format: /uploads/xxx or uploads/xxx
      proof.startsWith("/uploads/") ? proof.substring(1) : null,
      proof.startsWith("uploads/") ? proof : null,
      // Direct path as-is
      proof,
    ].filter(Boolean) as string[];

    console.log(`[payments/proof/${id}] Path variations to try:`, pathVariations);

    // Try each path variation
    for (const variation of pathVariations) {
      const testPath = path.join(uploadsDir, variation);
      const resolvedPath = path.resolve(testPath);
      const resolvedUploadsDir = path.resolve(uploadsDir);
      
      attemptedPaths.push(resolvedPath);
      
      // Security check
      if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        console.warn(`[payments/proof/${id}] ⚠️  Security check failed for: ${resolvedPath}`);
        continue;
      }

      console.log(`[payments/proof/${id}] 🔍 Trying path: ${resolvedPath}`);
      console.log(`[payments/proof/${id}]    File exists: ${fs.existsSync(resolvedPath)}`);
      
      if (fs.existsSync(resolvedPath)) {
        filePath = resolvedPath;
        console.log(`[payments/proof/${id}] ✅ File found at: ${resolvedPath}`);
        break;
      } else {
        console.log(`[payments/proof/${id}] ❌ File not found at: ${resolvedPath}`);
      }
    }

    // If still not found, try looking in proofs subdirectory directly
    if (!filePath) {
      const fileName = path.basename(proof);
      const proofsPath = path.join(uploadsDir, "proofs", fileName);
      attemptedPaths.push(proofsPath);
      
      console.log(`[payments/proof/${id}] 🔍 Trying proofs directory: ${proofsPath}`);
      console.log(`[payments/proof/${id}]    File exists: ${fs.existsSync(proofsPath)}`);
      
      if (fs.existsSync(proofsPath)) {
        filePath = proofsPath;
        console.log(`[payments/proof/${id}] ✅ File found in proofs dir: ${proofsPath}`);
      } else {
        console.log(`[payments/proof/${id}] ❌ File not found in proofs dir`);
      }
    }

    if (!filePath) {
      console.error(`[payments/proof/${id}] ❌ File not found anywhere. Attempted paths:`, attemptedPaths);
      
      // List actual files in uploads/proofs to help debug
      const proofsDir = path.join(uploadsDir, "proofs");
      console.log(`[payments/proof/${id}] 📁 Checking proofs directory: ${proofsDir}`);
      console.log(`[payments/proof/${id}]    Directory exists: ${fs.existsSync(proofsDir)}`);
      
      if (fs.existsSync(proofsDir)) {
        const files = fs.readdirSync(proofsDir);
        console.log(`[payments/proof/${id}] 📋 Files in proofs directory (${files.length} total):`, files.slice(0, 20));
        
        // Try to find a file that matches the payment ID in the filename
        const matchingFile = files.find(f => {
          const withoutExt = f.replace(/\.[^.]+$/, '');
          return withoutExt.includes(String(id)) || 
                 withoutExt.includes(payment.transactionId || '') ||
                 f === path.basename(proof);
        });
        
        if (matchingFile) {
          console.log(`[payments/proof/${id}] 🎯 Found potential matching file: ${matchingFile}`);
          filePath = path.join(proofsDir, matchingFile);
        } else {
          console.log(`[payments/proof/${id}] No matching file found by ID or transaction ID`);
        }
      } else {
        console.log(`[payments/proof/${id}] ⚠️  Proofs directory does not exist: ${proofsDir}`);
        
        // Try creating it
        try {
          fs.mkdirSync(proofsDir, { recursive: true });
          console.log(`[payments/proof/${id}] ✅ Created proofs directory: ${proofsDir}`);
        } catch (e) {
          console.error(`[payments/proof/${id}] ❌ Failed to create proofs directory:`, e);
        }
      }
      
      if (!filePath) {
        console.log(`[payments/proof/${id}] ==================== END (FAILED) ====================`);
        return NextResponse.json({ 
          error: "File not found on disk",
          dbPath: proof,
          attemptedPaths,
          message: "The file could not be found. Check server logs for details.",
          hint: "The database has the path but the file doesn't exist at that location"
        }, { status: 404 });
      }
    }

    // Serve the file
    console.log(`[payments/proof/${id}] 📤 Reading file: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";

    console.log(`[payments/proof/${id}] ✅ Serving file successfully:`);
    console.log(`[payments/proof/${id}]    Path: ${filePath}`);
    console.log(`[payments/proof/${id}]    Extension: ${ext}`);
    console.log(`[payments/proof/${id}]    Content-Type: ${contentType}`);
    console.log(`[payments/proof/${id}]    Size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    console.log(`[payments/proof/${id}] ==================== END (SUCCESS) ====================`);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (err: any) {
    console.error(`[payments/proof] ❌ ERROR:`, err);
    console.error(`[payments/proof] Stack trace:`, err.stack);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}