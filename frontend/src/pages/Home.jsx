import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import PhoneFrame from '../components/PhoneFrame';
import MotionButton from '../components/MotionButton';

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <PhoneFrame>
            <h1 className="text-5xl font-bold leading-tight text-center mt-16 mb-8 text-black">Young Heroes</h1>
            <motion.img
                src="/assets/teamwork.png"
                alt="Workflow Teamwork Illustration"
                className="w-[320px] h-[320px] mx-auto rounded-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            />

            <div className="flex flex-col items-center space-y-4 mb-16">
                <h2 className="w-[192px] h-[28px] text-2xl font-semibold text-center text-black">
                    Anyone can <span className="text-emerald-400">Help</span>
                </h2>
                <p className="w-[295px] h-[20px] text-sx text-gray-600 text-center">
                    When life is on the line.
                </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
                <MotionButton
                    onClick={() => navigate('/practice')}
                    className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-black text-white rounded-full border border-gray-100 shadow-xl duration-300 ease-in-out"
                >
                    Simulate
                </MotionButton>
                <MotionButton
                    onClick={() => navigate('/skills')}
                    className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-white text-gray-800 rounded-full border border-gray-100 shadow-xl hover:bg-gray-50 transition duration-300 ease-in-out"
                >
                    Skills
                </MotionButton>
            </div>
        </PhoneFrame>
    );
}
