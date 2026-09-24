import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

import PhoneFrame from '../components/PhoneFrame';
import MotionButton from '../components/MotionButton';
import BackButton from '../components/BackButton';

const questions = [
  {
    question: "What's your emergency?",
    options: [
      { text: 'Fire!', image: '/assets/generated/emergency-fire.jpg' },
      { text: 'Medical Help', image: '/assets/generated/emergency-medical.jpg' },
      { text: 'Danger!', image: '/assets/generated/emergency-danger.jpg' },
      { text: 'Other', image: '/assets/generated/emergency-other.jpg' },
    ],
  },
  {
    question: "Where are you at right now?",
    options: [
      { text: 'Home', image: '/assets/generated/location-home.jpg' },
      { text: 'School', image: '/assets/generated/location-school.jpg' },
      { text: 'Park', image: '/assets/generated/location-park.jpg' },
      { text: 'Shopping Mall', image: '/assets/generated/location-mall.jpg' },
    ],
  },
  {
    question: "Who is hurt?",
    options: [
      { text: 'Just me', image: '/assets/generated/hurt-me.jpg' },
      { text: 'My parents', image: '/assets/generated/hurt-parents.jpg' },
      { text: 'My friends', image: '/assets/generated/hurt-friends.jpg' },
      { text: 'My siblings', image: '/assets/generated/hurt-siblings.jpg' },
    ],
  },
  {
    question: "What is the problem?",
    options: [
      { text: 'I\'m stuck', image: '/assets/generated/problem-stuck.jpg' },
      { text: 'I broke my legs', image: '/assets/generated/problem-broken-leg.jpg' },
      { text: 'I am dizzy', image: '/assets/generated/problem-dizzy.jpg' },
      { text: 'My stomach is hurt', image: '/assets/generated/problem-stomach.jpg' },
    ],
  }
];

export default function Communicate() {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOptionClick = (index) => {
    setSelectedOption(index);
  };

  const handleContinue = () => {
    if (selectedOption === null) return;

    const nextAnswers = [
      ...answers,
      {
        question: currentQuestion.question,
        answer: currentQuestion.options[selectedOption].text,
      },
    ];

    if (currentQuestionIndex < questions.length - 1) {
      setAnswers(nextAnswers);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedOption(null);
    } else {
      sessionStorage.setItem('communicateResult', JSON.stringify(nextAnswers));
      navigate('/skills/communicate/result');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <PhoneFrame>
      <BackButton />
      <div className="flex-1 flex flex-col items-center p-6 space-y-6">
        <div className="text-4xl text-black">911 Emergency</div>
        <div className="text-xl text-black">{formatTime(timer)}</div>
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-gray-100 rounded-lg p-6 flex items-center min-h-[100px]"
        >
          <MessageSquare className="w-8 h-8 mr-4 text-gray-500" />
          <div className="text-black text-lg">{currentQuestion.question}</div>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 w-full">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => handleOptionClick(index)}
            >
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                animate={selectedOption === index ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.25 }}
                className={`w-full rounded-full flex items-center justify-center p-2 aspect-square border-2 overflow-hidden ${
                  selectedOption === index ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <img
                  src={option.image}
                  alt={option.text}
                  className="w-[90%] h-[90%] object-cover rounded-full"
                />
              </motion.div>
              <span
                className={`text-sm font-semibold ${
                  selectedOption === index ? 'text-green-600' : 'text-gray-700'
                }`}
              >
                {option.text}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center p-6">
        <MotionButton
          onClick={handleContinue}
          disabled={selectedOption === null}
          className={`w-[150px] py-3 px-4 text-lg font-bold rounded-full shadow-md transition duration-300 ease-in-out ${
            selectedOption === null
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          Continue
        </MotionButton>
      </div>
    </PhoneFrame>
  );
}
