import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import AilyAssistantPage from './pages/AilyAssistant/AilyAssistantPage';
import MeetingMinutesWorkbench from './pages/MeetingMinutesWorkbench/MeetingMinutesWorkbench';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AilyAssistantPage />} />
        <Route path="workbench" element={<MeetingMinutesWorkbench />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
