// This is the landing page of our NextJS application, forcing it to redirect to the signup page

import { redirect } from 'next/navigation';

export default function Home() {
    redirect('/signup');
} 