import { ChevronDown, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import type { User as UserType } from '../../app';

interface UserMenuProps {
  user: UserType;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-[0.625rem] hover:bg-[#f5f5f5] transition-colors"
      >
        <div className="w-8 h-8 bg-[#FFCE1B] rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-[#000000]" />
        </div>
        <ChevronDown className="w-4 h-4 text-[#000000]" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-[#C3C3C3] rounded-[0.625rem] shadow-lg z-20">
            <div className="p-4 border-b border-[#C3C3C3]">
              <p className="text-[#000000]">{user.name}</p>
              <p className="text-sm text-[#C3C3C3]">{user.email}</p>
              <p className="text-sm text-[#C3C3C3] capitalize mt-1">{user.role}</p>
              {user.station && (
                <p className="text-sm text-[#C3C3C3]">{user.station}</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-3 flex items-center space-x-2 text-[#000000] hover:bg-[#f5f5f5] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
