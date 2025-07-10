import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { fetchUserData } from '../../store/slices/userSlice';
import { API_URLS } from '../../lib/config';

const SignupForm: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[SignupForm] Starting signup process...');
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            // Validate form
            if (!form.email || !form.password || !form.firstName || !form.lastName) {
                throw new Error("All fields are required");
            }

            if (form.password !== form.confirmPassword) {
                throw new Error("Passwords do not match");
            }

            if (form.password.length < 8) {
                throw new Error("Password must be at least 8 characters long");
            }

            console.log('[SignupForm] Making API call to /api/signup...');
            const response = await fetch(API_URLS.SIGNUP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: form.email.toLowerCase().trim(),
                    password: form.password,
                    first_name: form.firstName.trim(),
                    last_name: form.lastName.trim(),
                }),
            });

            console.log('[SignupForm] Received response:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('[SignupForm] Error response:', errorData);
                throw new Error(errorData.detail || 'Failed to create account');
            }

            const data = await response.json();
            console.log('[SignupForm] Signup response data:', data);

            // Store the session data in localStorage
            console.log('[SignupForm] Storing session data in localStorage...');
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('user_id', data.user_id);
                localStorage.setItem('user_data', JSON.stringify(data.user));

                // Update Redux store
                console.log('[SignupForm] Updating Redux store...');
                try {
                    await dispatch(fetchUserData(data.access_token) as any);
                    console.log('[SignupForm] Redux store updated successfully');
                } catch (error) {
                    console.error('[SignupForm] Error updating Redux store:', error);
                }

                setSuccess(data.message);
                console.log('[SignupForm] Navigating to home...');
                router.push("/home");
            } else {
                console.error('[SignupForm] No access token in response');
                throw new Error('No access token received from server');
            }
        } catch (error: any) {
            console.error('[SignupForm] Error during signup:', error);
            setError(error.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Render your form here */}
        </div>
    );
};

export default SignupForm; 