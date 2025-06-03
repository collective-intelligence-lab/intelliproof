import SignupForm from '../components/SignupForm';
import Image from 'next/image';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex bg-black">
            {/* Left: Logo and Company Name */}
            <div className="flex-1 flex flex-col justify-center items-center">
                <Image src="/logo.png" alt="Intelliproof Logo" width={160} height={160} />
                <h1 className="text-white text-4xl font-bold mt-8">Welcome to Intelliproof</h1>
            </div>
            {/* Right: Signup Form */}
            <div className="flex-1 flex flex-col justify-center items-center bg-[#18181b]">
                <SignupForm />
            </div>
        </div>
    );
} 