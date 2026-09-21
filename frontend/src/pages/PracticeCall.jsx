import { Headphones } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import PhoneFrame from "../components/PhoneFrame";
import MotionButton from "../components/MotionButton";

const states = {
  START: "start",
  DISPATCHER: "dispatcher",
  USER: "user",
  END: "end",
  ERROR: "error",
};

const buttonInfo = {
  start: "Start Call",
  dispatcher: "Waiting for dispatcher...",
  user: "Stop Recording",
  end: "Call Ended",
  error: "Error",
};

export default function PracticeCall() {
  const [id, setId] = useState(null);
  const [state, setState] = useState(states.START);
  const [clickable, setClickable] = useState(true);
  const [prankCall, setPrankCall] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const finishedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioBlobRef = useRef(null);
  const textRef = useRef("");

  const navigate = useNavigate();
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => prevTimer + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const requestMicrophoneAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
      } catch (err) {
        console.error("Microphone access denied", err);
      }
    };

    requestMicrophoneAccess();

    // Function to fetch the ID from the API
    const fetchIdFromAPI = async () => {
      try {
        const response = await axios.get(api.newCall());
        if (response.data) {
          localStorage.setItem("uniqueId", response.data);
          setId(response.data);
        }
      } catch (error) {
        console.error("Error fetching ID:", error);
      }
    };

    // Check if the ID already exists in localStorage
    const storedId = localStorage.getItem("uniqueId");
    if (storedId) {
      setId(storedId);
    } else {
      fetchIdFromAPI();
    }
  }, []);

  const handleStartCall = () => {
    console.log("Starting call...");
    setClickable(false);
    setState(states.DISPATCHER);
  };

  const handleDispatcherCall = async (text) => {
    try {
      const response = await axios.get(api.tts(text, id), {
        responseType: "arraybuffer",
      });
      if (response.data) {
        console.log("Audio file received:", response.data);
        const saveAudioFile = (audioData) => {
          const blob = new Blob([audioData], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          return url;
        };

        const audiourl = saveAudioFile(response.data);

        const playaudio = new Audio(audiourl);
        playaudio.play();

        const waitForAudioToEnd = () => {
          return new Promise((resolve) => {
            playaudio.addEventListener("ended", resolve);
          });
        };

        await waitForAudioToEnd();
      }
    } catch (error) {
      setState(states.ERROR);
      console.error("Error starting call:", error);
    } finally {
      var isEnding = false;
      try {
        const response = await axios.get(api.getCallStates(id));
        if (response.data) {
          console.log(response.data);
          if (response.data[0]) {
            isEnding = true;
          }
          if (response.data[1]) {
            setPrankCall(true);
          }
        }
      } catch (error) {
        setState(states.ERROR);
        console.error("Error getting call states:", error);
      } finally {
        if (isEnding) {
          finishedRef.current = true;
          setState(states.END);
          localStorage.removeItem("uniqueId");
        } else {
          setState(states.USER);
          startRecording();
          setClickable(true);
        }
      }
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      console.log("Recording started");
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        audioBlobRef.current = audioBlob;
        setIsRecording(false);
        textRef.current = await handleSpeechToText();

        setState(states.DISPATCHER);
        await handleDispatcherCall(textRef.current);
      };
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSpeechToText = async () => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlobRef.current);

      const response = await axios.post(
        api.stt(),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data) {
        console.log("Speech to text result:", response.data);
        return response.data;
      }
    } catch (error) {
      console.error("Error converting speech to text:", error);
    }
  };

  const handleClick = async () => {
    switch (state) {
      case states.START:
        handleStartCall();
        await handleDispatcherCall("<START>");
        break;
      case states.USER:
        stopRecording();
        setClickable(false);
        console.log("Recording stopped");
        console.log("Audio chunks:", audioChunksRef.current);
        console.log("Audio Blob:", audioBlobRef.current);
        break;
    }
  };

  const handleEndCall = () => {
    sessionStorage.setItem(
      "callResult",
      JSON.stringify({
        duration: timer,
        naturalEnd: state === states.END,
        prankCall,
      })
    );
    localStorage.removeItem("uniqueId");
    navigate("/practice/call/result");
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <PhoneFrame className="bg-red-100">
      <div className="flex-1 p-6 flex flex-col">
        <div className="text-center mt-8">
          <h1 className="text-4xl text-black">911</h1>
          <h2 className="text-2xl font-semibold mt-1 text-red-400">
            Emergency Calling...
          </h2>
          <div className="text-xl text-red-400">{formatTime(timer)}</div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-64 h-64">
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-200 rounded-full opacity-25 animate-pulse"
              style={{
                width: "311px",
                height: "311px",
                animationDelay: "0.2s",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-300 rounded-full opacity-30 animate-pulse"
              style={{
                width: "256px",
                height: "256px",
                animationDelay: "0.4s",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-400 rounded-full flex items-center justify-center opacity-65 animate-pulse"
              style={{ width: "191px", height: "191px" }}
            >
              <Headphones className="text-white animate-wiggle" size={70} />
            </div>
            <div className="absolute -top-24 -right-20 w-40 h-40 rounded-full">
              <img src="/assets/planet.png" alt="planet" className="w-50" />
            </div>
            <div className="absolute -bottom-12 -left-20 w-50 h-50 rounded-md transform rotate-12 flex items-center justify-center">
              <img src="/assets/ballon.png" alt="ballon" className="" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 pt-0 flex justify-center items-center">
        <MotionButton
          className="w-60 mb-8 bg-white text-gray-800 font-semibold py-3 px-4 rounded-full transition duration-300 ease-in-out shadow-xl"
          onClick={handleClick}
          disabled={!clickable}
        >
          {buttonInfo[state]}
        </MotionButton>
      </div>

      <div className="p-6 pt-0 flex justify-center items-center">
        <MotionButton
          className="w-60 mb-8 bg-white text-gray-800 font-semibold py-3 px-4 rounded-full transition duration-300 ease-in-out shadow-xl"
          onClick={handleEndCall}
        >
          End Call
        </MotionButton>
      </div>
    </PhoneFrame>
  );
}
