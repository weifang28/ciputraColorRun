import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../../middleware/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    
    if (!auth.authenticated) {
      // Return 401 to trigger redirect in layout
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        name: auth.user?.name || 'Admin', 
        role: auth.user?.role || 'admin' 
      } 
    });
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}