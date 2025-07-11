"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to graph-manager instead of showing home page
        router.push('/graph-manager');
    }, [router]);

    // Return a loading state while redirecting
    return (
        null
    );
} 