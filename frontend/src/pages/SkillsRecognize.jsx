import { Volume2, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import PhoneFrame from "../components/PhoneFrame";
import MotionButton from "../components/MotionButton";
import BackButton from "../components/BackButton";

const START_HEARTS = 10;

export default function LearnRecognize() {
  const [voices, setVoices] = useState([]);
  const [value, setValue] = useState(START_HEARTS);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [current, setCurrent] = useState(0);
  const [isCorrectChoice, setIsCorrectChoice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadVoices = () => {
      const voicesList = window.speechSynthesis.getVoices();
      setVoices(voicesList);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const scenarios = [
    {
      id: "home",
      image: "/assets/generated/kitchen-smoke.jpg",
      description:
        "You're at home and you smell smoke coming from the kitchen. What do you do?",
      options: [
        {
          text: "Go to the kitchen to check",
          nextScenario: "kitchen",
          isCorrect: false,
          feedback:
            "It's brave to investigate, but it's safer to get help first when you smell smoke.",
        },
        {
          text: "Open a window",
          nextScenario: "window",
          isCorrect: true,
          feedback:
            "Opening a window might help with smoke, but it's not addressing the main problem.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Great choice! Calling 911 immediately when you smell smoke is the safest option.",
      },
    },
    {
      id: "kitchen",
      image: "/assets/generated/stove-fire.jpg",
      description: "You see a small fire on the stove. What's your next move?",
      options: [
        {
          text: "Try to put it out with water",
          nextScenario: "water",
          isCorrect: false,
          feedback:
            "Water can make some fires worse, especially if it's an oil fire. It's safer to call for help.",
        },
        {
          text: "Leave the house immediately",
          nextScenario: "outside",
          isCorrect: true,
          feedback:
            "Good thinking! Getting out of the house quickly is very important when there's a fire.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Excellent choice! Calling 911 right away is the best thing to do in case of a fire.",
      },
    },
    {
      id: "window",
      image: "/assets/generated/window-open.jpg",
      description:
        "You've opened a window, but the smoke is getting worse. What now?",
      options: [
        {
          text: "Go back to check the kitchen",
          nextScenario: "kitchen",
          isCorrect: false,
          feedback:
            "It's dangerous to go towards the source of smoke. It's better to get out and get help.",
        },
        {
          text: "Leave the house",
          nextScenario: "outside",
          isCorrect: true,
          feedback:
            "Great decision! Getting out of the house when there's smoke is the safe thing to do.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Perfect! Calling 911 is always the right choice when there's a potential fire.",
      },
    },
    {
      id: "water",
      image: "/assets/generated/fire-worse.jpg",
      description:
        "The water made the fire worse! It's spreading quickly. What do you do?",
      options: [
        {
          text: "Try to find a fire extinguisher",
          nextScenario: "extinguisher",
          isCorrect: false,
          feedback:
            "While fire extinguishers can be helpful, at this point it's safer to get out and call for help.",
        },
        {
          text: "Leave the house immediately",
          nextScenario: "outside",
          isCorrect: true,
          feedback:
            "Excellent choice! When a fire is spreading, getting out quickly is the best thing to do.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Great thinking! Calling 911 right away is crucial when a fire is spreading.",
      },
    },
    {
      id: "outside",
      image: "/assets/generated/see-fire.jpg",
      description:
        "You're safely outside, but the fire is still burning inside. What's the best action?",
      options: [
        {
          text: "Wait for help to arrive",
          nextScenario: "wait",
          isCorrect: false,
          feedback:
            "Waiting is good, but there's one more important step to take.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Perfect! Even when you're safe outside, it's crucial to call 911 to report the fire.",
      },
    },
    {
      id: "extinguisher",
      image: "/assets/generated/fire-worse.jpg",
      description:
        "You couldn't find a fire extinguisher, and the fire is getting bigger. What now?",
      options: [
        {
          text: "Leave the house immediately",
          nextScenario: "outside",
          isCorrect: true,
          feedback:
            "Great decision! When you can't control a fire, getting out quickly is the best choice.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Excellent! Calling 911 is crucial when a fire is out of control.",
      },
    },
    {
      id: "wait",
      image: "/assets/generated/burning-house.jpg",
      description:
        "You're waiting outside, but no one seems to know about the fire. What should you do?",
      options: [
        {
          text: "Ask a neighbor for help",
          nextScenario: "neighbor",
          isCorrect: false,
          feedback:
            "Asking for help is good, but there's a faster way to get professional help.",
        },
      ],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Perfect! Even if you're safe outside, it's important to call 911 to report the fire.",
      },
    },
    {
      id: "neighbor",
      image: "/assets/generated/call-help.jpg",
      description:
        "Your neighbor suggests calling the fire department. What's the best way to do that?",
      options: [],
      call911: {
        text: "Call 911",
        nextScenario: null,
        isCorrect: true,
        feedback:
          "Excellent! Calling 911 is the fastest way to reach the fire department in an emergency.",
      },
    },
  ];

  const handleOptionClick = (option) => {
    setFeedbackMessage(option.feedback);
    setShowFeedback(true);
    setIsCorrectChoice(option.isCorrect);

    const nextValue = option.isCorrect ? value : value - 1;

    setTimeout(() => {
      const nextScenarioId = option.nextScenario;
      if (nextScenarioId === null) {
        sessionStorage.setItem(
          "recognizeResult",
          JSON.stringify({ hearts: nextValue, startHearts: START_HEARTS })
        );
        navigate('/skills/recognize/result');
      } else {
        const nextScenarioIndex = scenarios.findIndex(
          (scenario) => scenario.id === nextScenarioId
        );
        setCurrent(nextScenarioIndex);
      }

      setShowFeedback(false);
      setIsCorrectChoice(null);
      setValue(nextValue);
    }, 2000);
  };


  function speakDescription(text) {
    if (voices.length > 0) {
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.voice = voices[5] || voices[0];

      utterance.pitch = 1.3;
      utterance.rate = 1.1;

      window.speechSynthesis.speak(utterance);
    }
  }


  return (
    <PhoneFrame>
      <BackButton />
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6 pl-10">
          <MotionButton onClick={() => speakDescription(scenarios[current].description)}
          className="bg-white hover:bg-gray-200 p-2 rounded-full">
            <Volume2 className="text-gray-600" size={24} />
          </MotionButton>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-semibold">{value}</span>
            <Heart className="text-red-600" size={24} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showFeedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`border rounded-lg p-4 mb-6 flex items-start ${
                isCorrectChoice ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
              }`}
            >
              <div
                className={`mr-2 flex-shrink-0 ${
                  isCorrectChoice ? "text-green-500" : "text-red-500"
                }`}
                style={{ fontSize: "20px", lineHeight: "20px" }}
              >
                {isCorrectChoice ? "✓" : "✗"}
              </div>
              <div>
                <p
                  className={`font-extrabold ${
                    isCorrectChoice ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {isCorrectChoice ? "Correct choice" : "Wrong choice"}
                </p>
                <p className="text-black text-sm">{feedbackMessage}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
              style={{ height: "64px" }}
            >
              <p className="font-bold text-black">
                {scenarios[current].description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 border-2 border-gray-300 rounded-2xl mb-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={scenarios[current].image}
              alt="scenario"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        <div className="relative space-y-4">
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{ top: "-50px", left: "-10px" }}
          >
            <img src="/assets/learnRec2.png" alt="decoration" className="w-full h-full" />
          </div>
          {scenarios
            .filter((scenario, index) => index === current)
            .flatMap((scenario) => scenario.options)
            .map((option, index) => (
              <MotionButton
                key={index}
                className="w-full border border-gray-300 rounded-full bg-white hover:bg-gray-300 text-gray-800 transition duration-300 ease-in-out"
                onClick={() => handleOptionClick(option)}
              >
                {option.text}
              </MotionButton>
            ))}
        </div>
      </div>

      <div className="relative p-6 pt-2 flex justify-center items-center">
        {/* Decorative images live as siblings of MotionButton, not children —
            MotionButton's whileHover scale applies a CSS transform, and a
            transformed ancestor becomes the containing block for any
            absolutely-positioned descendants, which would otherwise yank
            these images to a new position on hover. */}
        <div className="absolute left-5 bottom-5 w-10 h-10 rounded-full">
          <img src="/assets/star.png" alt="decoration" className="w-full h-full" />
        </div>
        <MotionButton
          onClick={() => handleOptionClick(scenarios[current].call911)}
          className="w-40 border border-gray-100 bg-white text-gray-800 font-semibold py-3 px-4 rounded-full transition duration-300 ease-in-out shadow-xl"
        >
          Call 911
        </MotionButton>
        <div className="absolute right-5 bottom-7 w-24 h-24 rounded-full">
          <img src="/assets/learnRec1.png" alt="decoration" className="w-full h-full" />
        </div>
      </div>
    </PhoneFrame>
  );
}
