import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
    duration?: number;
}

const Confetti: React.FC<ConfettiProps> = ({ duration = 3000 }) => {
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);

        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, duration);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, [duration]);

    if (!showConfetti) return null;

    return (
        <ReactConfetti
            width={windowDimensions.width}
            height={windowDimensions.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.2}
            colors={['#E50046', '#FDAB9E', '#FFF0BD', '#C7DB9C', '#4F46E5', '#10B981']}
        />
    );
};

export default Confetti; 