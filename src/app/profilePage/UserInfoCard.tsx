"use client";

import { useState } from 'react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { User, Mail, Phone } from 'lucide-react';

interface UserInfoCardProps {
  userName: string;
  email: string;
  phone: string;
  onUpdate: (email: string, phone: string) => void;
}

export function UserInfoCard({ userName, email, phone, onUpdate }: UserInfoCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editEmail, setEditEmail] = useState(email);
  const [editPhone, setEditPhone] = useState(phone);

  const handleSave = () => {
    onUpdate(editEmail, editPhone);
    setIsOpen(false);
  };

  return (
    <Card className="relative overflow-hidden bg-white/70 backdrop-blur-xl border-white/90 shadow-2xl">
      {/* Gradient accent border glow - green gradient */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#91DCAC] via-[#91DCAC] to-[#91DCAC]"></div>
      
      <div className="p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          {/* Avatar - green gradient */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#91DCAC] via-[#91DCAC] to-[#91DCAC] flex items-center justify-center shadow-2xl ring-4 ring-white/60">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-[#FFDFC0] to-[#FFF1C5] border-4 border-white shadow-lg"></div>
          </div>
          
          {/* Name */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-[#682950] mb-2">{userName}</h2>
            <div className="h-1 w-20 mx-auto sm:mx-0 bg-gradient-to-r from-[#91DCAC] to-[#91DCAC] rounded-full"></div>
          </div>
        </div>

        {/* Contact Info - matching My Purchase style with green tones */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#91DCAC]/20 to-[#91DCAC]/15 border border-[#91DCAC]/50 transition-all hover:shadow-lg hover:border-[#91DCAC]/70">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#91DCAC] to-[#91DCAC] flex items-center justify-center shadow-lg flex-shrink-0">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#682950]/70 mb-1">Email Address</p>
              <p className="text-[#682950] truncate">{email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#91DCAC]/20 to-[#91DCAC]/15 border border-[#91DCAC]/50 transition-all hover:shadow-lg hover:border-[#91DCAC]/70">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#91DCAC] to-[#91DCAC] flex items-center justify-center shadow-lg flex-shrink-0">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#682950]/70 mb-1">Phone Number</p>
              <p className="text-[#682950]">{phone}</p>
            </div>
          </div>
        </div>

        {/* Edit Button - green gradient */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-[#91DCAC] via-[#91DCAC] to-[#91DCAC] hover:from-[#91DCAC]/90 hover:via-[#91DCAC]/90 hover:to-[#91DCAC]/90 text-white border-0 shadow-xl rounded-2xl h-12 transition-all hover:shadow-2xl hover:scale-[1.02]">
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-2xl border-white/90 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#682950]">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#682950]/80">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-gradient-to-r from-[#FFF1C5]/30 to-white/80 border-[#94DCAD]/40 focus:border-[#4EF9CD] rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#682950]/80">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-gradient-to-r from-[#FFDFC0]/30 to-white/80 border-[#91DCAC]/40 focus:border-[#91DCAC] rounded-xl h-12"
                />
              </div>
              <Button
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-[#73E9DD] via-[#4EF9CD] to-[#94DCAD] hover:from-[#73E9DD]/90 hover:via-[#4EF9CD]/90 hover:to-[#94DCAD]/90 text-white border-0 rounded-2xl h-12 shadow-xl"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}