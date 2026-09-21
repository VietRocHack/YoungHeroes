import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import PhoneFrame from '../components/PhoneFrame';
import MotionButton from '../components/MotionButton';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CommunicateResult = () => {
    const navigate = useNavigate();
    const [answers, setAnswers] = useState([]);

    useEffect(() => {
      try {
        const stored = sessionStorage.getItem('communicateResult');
        if (stored) setAnswers(JSON.parse(stored));
      } catch (e) {
        console.error('Could not read communicate result', e);
      }
    }, []);

    return (
        <PhoneFrame className="items-center justify-between py-8 px-6">
            <motion.div variants={container} initial="hidden" animate="show" className="text-center">
                <motion.h1 variants={item} className="text-3xl font-semibold text-gray-800 mb-2">You have completed!</motion.h1>
                <motion.p variants={item} className="text-lg text-gray-600">Here's what you told the dispatcher</motion.p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="relative w-64 h-64"
            >
                <div className="absolute inset-0 bg-green-200 rounded-full" style={{ width: '256px', height: '256px' }}></div>
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-50 rounded-full"
                    style={{ width: '311px', height: '311px' }}
                ></div>
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-200 rounded-full"
                    style={{ width: '256px', height: '256px' }}
                ></div>
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
                    style={{ width: '191px', height: '191px', backgroundColor: '#3cdb7f' }}
                >
                    <img
                        src="/assets/check-circle.png"
                        alt="Completed"
                    />
                </div>
            </motion.div>

            <div className="bg-gray-100 rounded-lg p-4 w-full max-w-xs">
                <h2 className="text-lg font-semibold mb-2 text-black">Summary</h2>
                <ul className="text-gray-700 space-y-1 text-left">
                  {answers.map((a, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <span className="font-medium">{a.question}</span> {a.answer}
                    </motion.li>
                  ))}
                </ul>
            </div>

            <MotionButton
                onClick={() => navigate('/')}
                className="w-[150px] py-3 px-4 text-lg font-bold bg-white text-black rounded-full shadow-md hover:bg-gray-50 transition duration-300 ease-in-out"
            >
                Home
            </MotionButton>
        </PhoneFrame>
    );
}

export default CommunicateResult;
