import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import PhoneFrame from '../components/PhoneFrame';
import BackButton from '../components/BackButton';

export default function DecisionToCall() {
    const navigate = useNavigate();
    return (
        <PhoneFrame className="items-center justify-center gap-16 py-8 px-6">
            <BackButton />
            <div className="text-center">
                <h1 className="text-3xl font-semibold text-gray-800 mt-16">Having an Emergency?</h1>
                <p className="text-lg text-gray-600 mt-4">
                    Press the button below
                    <br/>
                    help will come soon.
                </p>
            </div>

            <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-green-200 rounded-full" style={{ width: '256px', height: '256px' }}></div>
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-50 rounded-full animate-pulse"
                    style={{ width: '311px', height: '311px' }}
                ></div>
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-200 rounded-full"
                    style={{ width: '256px', height: '256px' }}
                ></div>
                {/* Position/centering lives on this plain wrapper — Framer Motion's
                    scale animation would otherwise overwrite the translate-x/y-1/2
                    centering transform. */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: '191px', height: '191px' }}
                >
                    <motion.div
                        className="w-full h-full bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
                        onClick={() => navigate('/practice/call')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                    >
                        <img
                            src="/assets/phone-call.png"
                            alt="Completed"
                        />
                    </motion.div>
                </div>
            </div>
        </PhoneFrame>
    );
}
