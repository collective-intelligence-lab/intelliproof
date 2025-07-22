import React from "react";
import Link from "next/link";
import { useUserName } from "../hooks/useUserName";

interface NavbarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navOptions = [
  { label: "Graph Manager", href: "/graph-manager" },
  { label: "Profile", href: "/profile" },
];

const Navbar: React.FC<NavbarProps> = ({ isOpen, onClose }) => {
  const userName = useUserName();

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#232F3E] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <button
        onClick={onClose}
        className="absolute top-8 right-10 text-white text-4xl focus:outline-none"
        aria-label="Close menu"
      >
        &times;
      </button>
      <div className="flex flex-col items-center gap-8">
        {userName && (
          <div className="text-white text-2xl font-bold mb-4">
            Welcome, {userName}
          </div>
        )}
        <nav className="flex flex-col gap-8 text-3xl text-white">
          {navOptions.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              onClick={onClose}
              className="hover:underline transition-all duration-200 hover:text-gray-300"
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
