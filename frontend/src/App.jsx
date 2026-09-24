import { Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import Practice from './pages/Practice'
import PracticeDecision from './pages/PracticeDecision'
import PracticeCall from './pages/PracticeCall'
import PracticeCallResult from './pages/PracticeCallResult'
import Skills from './pages/Skills'
import SkillsRecognize from './pages/SkillsRecognize'
import SkillsRecognizeResult from './pages/SkillsRecognizeResult'
import SkillsCommunicate from './pages/SkillsCommunicate'
import SkillsCommunicateResult from './pages/SkillsCommunicateResult'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/practice/decision" element={<PracticeDecision />} />
      <Route path="/practice/call" element={<PracticeCall />} />
      <Route path="/practice/call/result" element={<PracticeCallResult />} />
      <Route path="/skills" element={<Skills />} />
      <Route path="/skills/recognize" element={<SkillsRecognize />} />
      <Route path="/skills/recognize/result" element={<SkillsRecognizeResult />} />
      <Route path="/skills/communicate" element={<SkillsCommunicate />} />
      <Route path="/skills/communicate/result" element={<SkillsCommunicateResult />} />
    </Routes>
  )
}
