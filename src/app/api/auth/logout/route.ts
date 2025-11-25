import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear all authentication cookies with proper settings
    const cookieSettings = 'Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
    
    response.headers.append('Set-Cookie', `auth-token=; ${cookieSettings}`);
    response.headers.append('Set-Cookie', `access_code=; ${cookieSettings}`);
    response.headers.append('Set-Cookie', `admin_access=; ${cookieSettings}`);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}