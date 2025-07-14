import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      style={{ color: "#000000", fontWeight: 500 }}
      className={`w-full px-4 py-2 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  );
}
