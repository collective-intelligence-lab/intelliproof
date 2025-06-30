import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const useUserName = () => {
    const [userName, setUserName] = useState<string>('');
    const { profile } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (profile && profile.first_name && profile.last_name) {
            setUserName(`${profile.first_name} ${profile.last_name}`);
        } else if (profile && profile.email) {
            setUserName(profile.email);
        } else {
            // Try to get user data from localStorage as fallback
            const userData = localStorage.getItem('user_data');
            if (userData) {
                try {
                    const parsedData = JSON.parse(userData);
                    if (parsedData.first_name && parsedData.last_name) {
                        setUserName(`${parsedData.first_name} ${parsedData.last_name}`);
                    } else if (parsedData.email) {
                        setUserName(parsedData.email);
                    } else {
                        setUserName('');
                    }
                } catch {
                    setUserName('');
                }
            } else {
                setUserName('');
            }
        }
    }, [profile]);

    return userName;
}; 