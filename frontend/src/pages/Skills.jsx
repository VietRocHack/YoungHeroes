import { useNavigate } from 'react-router-dom';

import PhoneFrame from '../components/PhoneFrame';
import MotionButton from '../components/MotionButton';
import BackButton from '../components/BackButton';

export default function Skills() {
    const navigate = useNavigate();

    return (
        <PhoneFrame>
            <BackButton to="/" />
            <h1 className="text-3xl font-thin leading-tight text-center mt-8 text-black">
                Explore skills to know
                <br/>
                in an emergency
            </h1>

            <div className="flex flex-col items-center space-y-8">
                <div className="relative">
                    <img
                        src="/assets/searching.png"
                        alt="Recognize"
                        className="w-[300px] h-[300px] mx-auto rounded-lg"
                    />
                    {/* Position/centering lives on this plain wrapper — Framer Motion's
                        scale animation on MotionButton would otherwise overwrite the
                        translate-x-1/2 centering transform below. */}
                    <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2">
                        <MotionButton
                            onClick={() => navigate('/skills/recognize')}
                            className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-white text-gray-800 rounded-full border border-gray-100 shadow-xl hover:bg-gray-50 transition duration-300 ease-in-out"
                        >
                            Recognize
                        </MotionButton>
                    </div>
                </div>

                <div className="relative mt-8">
                    <img
                        src="/assets/relationship.png"
                        alt="Communicate"
                        className="w-[300px] h-[300px] mx-auto rounded-lg"
                    />
                    <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2">
                        <MotionButton
                            onClick={() => navigate('/skills/communicate')}
                            className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-white text-gray-800 rounded-full border border-gray-100 shadow-xl hover:bg-gray-50 transition duration-300 ease-in-out"
                        >
                            Communicate
                        </MotionButton>
                    </div>
                </div>

                <div className="relative mt-8">
                    <img
                        src="/assets/unsubscribed.png"
                        alt="Back"
                        className="w-[300px] h-[300px] mx-auto rounded-lg"
                    />
                    <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2">
                        <MotionButton
                            onClick={() => navigate('/')}
                            className="w-[211px] h-[56px] py-3 px-4 text-lg font-bold bg-white text-gray-800 rounded-full border border-gray-100 shadow-xl hover:bg-gray-50 transition duration-300 ease-in-out"
                        >
                            Back
                        </MotionButton>
                    </div>
                </div>
            </div>
        </PhoneFrame>
    );
}
