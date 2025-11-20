import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin, getRemainingLockTime } from "@/lib/rateLimiter";

const prisma = new PrismaClient();

function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a constant identifier for local development
  return 'admin-login-client';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body || {};

    // Get client identifier (IP address)
    const clientId = getClientIdentifier(request);

    // Check rate limit BEFORE validating credentials
    const rateLimit = checkRateLimit(clientId);
    
    if (!rateLimit.allowed) {
      const remainingTime = rateLimit.lockedUntil 
        ? getRemainingLockTime(rateLimit.lockedUntil)
        : '24 hours';
      
      return NextResponse.json(
        { 
          error: `Too many failed login attempts. Account locked for ${remainingTime}. Please try again later.`,
          lockedUntil: rateLimit.lockedUntil,
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    // Get credentials from environment variables
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;

    // Validate input
    if (!username || !password) {
      recordFailedAttempt(clientId);
      return NextResponse.json(
        { 
          error: "Missing credentials",
          remainingAttempts: rateLimit.remainingAttempts - 1,
        },
        { status: 400 }
      );
    }

    // Verify credentials against environment variables
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      recordFailedAttempt(clientId);
      const newLimit = checkRateLimit(clientId);
      
      if (newLimit.remainingAttempts === 0) {
        const lockTime = newLimit.lockedUntil 
          ? getRemainingLockTime(newLimit.lockedUntil)
          : '24 hours';
        
        return NextResponse.json(
          { 
            error: `Invalid credentials. Account locked for ${lockTime} due to too many failed attempts.`,
            lockedUntil: newLimit.lockedUntil,
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Invalid username or password",
          remainingAttempts: newLimit.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Verify admin user exists in database
    const adminUser = await prisma.user.findUnique({
      where: { accessCode: ADMIN_ACCESS_CODE },
    });

    if (!adminUser || adminUser.role !== "admin") {
      recordFailedAttempt(clientId);
      return NextResponse.json({ error: "Admin user not found in database" }, { status: 401 });
    }

    // Ensure env access code is present before encoding
    if (!ADMIN_ACCESS_CODE) {
      console.error("POST /api/admin/login: missing ADMIN_ACCESS_CODE env var");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Successful login - clear failed attempts
    recordSuccessfulLogin(clientId);

    // Set secure cookie
    const res = NextResponse.json(
      {
        success: true,
        message: "Authenticated",
        user: { name: adminUser.name, role: adminUser.role },
      },
      { status: 200 }
    );

    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const cookie = `admin_access=${encodeURIComponent(ADMIN_ACCESS_CODE)}; Path=/; HttpOnly; SameSite=Strict; ${secureFlag}Max-Age=${maxAge}`;

    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch (err: any) {
    console.error("POST /api/admin/login error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}