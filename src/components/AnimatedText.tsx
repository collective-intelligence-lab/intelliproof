import React, { useEffect, useState } from 'react';

const AnimatedText = () => {
    const [text, setText] = useState('');
    const fullText = "Welcome to Intelliproof - Your Argument Mapping Journey Begins Here";
    const [isDeleting, setIsDeleting] = useState(false);
    const [speed, setSpeed] = useState(100);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isDeleting && text === fullText) {
                setTimeout(() => setIsDeleting(true), 2000);
                return;
            }

            if (isDeleting && text === '') {
                setIsDeleting(false);
                return;
            }

            const delta = isDeleting ? -1 : 1;
            setText(fullText.substring(0, text.length + delta));
            setSpeed(isDeleting ? 50 : 100);
        }, speed);

        return () => clearTimeout(timer);
    }, [text, isDeleting, speed, fullText]);

    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-zinc-900 rounded-xl shadow-lg">
            <div className="text-2xl font-bold text-white mb-4">
                {text}
                <span className="animate-blink">|</span>
            </div>
            <p className="text-zinc-400 text-lg">
                Select a tab from the menu to get started with your argument mapping journey.
            </p>
        </div>
    );
};

export default AnimatedText; 