import { useNavigate } from 'react-router-dom';

import PhoneFrame from '../components/PhoneFrame';
import MotionButton from '../components/MotionButton';
import BackButton from '../components/BackButton';

export default function Practice() {
    const navigate = useNavigate();

    return (
        <PhoneFrame>
            <BackButton to="/" />
            <h1 className="text-3xl font-thin leading-tight text-center mt-8 text-black">
                Practice calling 911
                <br/>
                in a simulation
            </h1>

            <div className="flex flex-col items-center space-y-8">
                <div className="relative">
                    <img
                        src="/assets/run.png"
                        alt="Start Practice"
                        className="w-[300px] h-[300px] mx-auto rounded-lg"
                    />
                    {/* Position/centering lives on this plain wrapper — Framer Motion's
                        scale animation on MotionButton would otherwise overwrite the
                        translate-x-1/2 centering transform below. */}
                    <div className="absolute bottom-[-21px] left-1/2 -translate-x-1/2">
                        <MotionButton
                            onClick={() => navigate('/practice/decision')}
                            className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-white text-gray-800 rounded-full border border-gray-100 shadow-xl hover:bg-gray-50 transition duration-300 ease-in-out"
                        >
                            Start Practice
                        </MotionButton>
                    </div>
                </div>
            </div>
        </PhoneFrame>
    );
}
