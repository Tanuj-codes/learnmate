import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Lesson from './pages/Lesson.jsx';
import Practice from './pages/Practice.jsx';
import Quiz from './pages/Quiz.jsx';
import QuizPlay from './pages/QuizPlay.jsx';
import Results from './pages/Results.jsx';
import Flashcards from './pages/Flashcards.jsx';
import Games from './pages/Games.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Accountability from './pages/Accountability.jsx';
import Achievements from './pages/Achievements.jsx';
import Analytics from './pages/Analytics.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';
import ErrorPage from './pages/ErrorPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/lessons/:lessonId" element={<Lesson />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/quizzes/:quizId" element={<Quiz />} />
          <Route path="/quizzes/:quizId/attempt" element={<QuizPlay />} />
          <Route path="/attempts/:attemptId" element={<Results />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/games" element={<Games />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/accountability" element={<Accountability />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
