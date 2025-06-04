'use client';
import SignupForm from '../../components/SignupForm';
import Image from 'next/image';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex bg-white" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
            {/* Left: Logo and Welcome Back */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white">
                <Image src="/logo.png" alt="Intelliproof Logo" width={160} height={160} />
                <h1 className="text-black text-4xl font-bold mt-8 text-center">Welcome to Intelliproof</h1>
            </div>
            {/* Right: Signup Form */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white">
                <SignupForm />
            </div>
        </div>
    );
} 