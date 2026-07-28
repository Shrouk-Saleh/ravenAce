import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [consuming, setConsuming] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.get(`/integrations/invitations/${token}/verify`);
        setInvitationData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Invalid or expired invitation.");
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);

  const handleConsume = async () => {
    setConsuming(true);
    setError(null);
    try {
      const response = await api.post(`/integrations/invitations/${token}/consume`);
      const examId = response.data.data.examId;
      navigate(`/exams/${examId}`);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("This invitation was sent to a different email address. Please log out and try again with the correct account.");
      } else {
        setError(err.response?.data?.message || "Failed to process invitation.");
      }
    } finally {
      setConsuming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          {user && (
            <p className="text-sm text-gray-500 mb-4">
              You are currently logged in as <strong>{user.email}</strong>.
            </p>
          )}
          <Link to="/" className="inline-block w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // If already consumed and user happens to click the link again, they might just see "already consumed" error from verify endpoint or we handle it here
  if (invitationData?.status === "consumed") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Consumed</h2>
          <p className="text-gray-600 mb-6">This invitation has already been used.</p>
          <button 
            onClick={() => navigate(`/exams/${invitationData.exam._id}`)}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Go to Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Invitation</h1>
          <p className="text-gray-500">
            You have been invited by <strong className="text-gray-900">{invitationData.exam.companyName}</strong> to complete the <strong className="text-gray-900">{invitationData.exam.title}</strong> assessment.
          </p>
        </div>

        {/* CASE A: User is logged in */}
        {user ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Logged in as</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>

            {user.email.toLowerCase() === invitationData.email.toLowerCase() ? (
              <button
                onClick={handleConsume}
                disabled={consuming}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {consuming ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  "Accept & Go to Exam"
                )}
              </button>
            ) : (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-red-700 text-sm font-medium mb-3">
                  Email mismatch: This invitation was sent to <strong>{invitationData.email}</strong>.
                </p>
                <Link to="/login" className="block text-center py-2 px-4 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors">
                  Log out & switch account
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* CASE B: User is NOT logged in */
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-6">
              <p className="text-sm text-gray-600 text-center">
                To accept this invitation for <strong>{invitationData.email}</strong>, you need an account.
              </p>
            </div>
            
            <Link 
              to={`/login?returnUrl=/invite/${token}`}
              className="block w-full text-center py-3.5 px-4 bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-all"
            >
              Log in with existing account
            </Link>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={() => alert("Account creation logic (Case B) will be implemented in the next step.")}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200"
            >
              Create a new account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
