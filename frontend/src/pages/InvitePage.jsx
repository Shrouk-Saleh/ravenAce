import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  
  // Case A state
  const [consuming, setConsuming] = useState(false);
  
  // Case B states
  const [caseBView, setCaseBView] = useState("selection"); // 'selection' | 'register' | 'otp'
  const [formData, setFormData] = useState({ name: "", password: "", confirmPassword: "" });
  const [otp, setOtp] = useState("");
  const [caseBSubmitting, setCaseBSubmitting] = useState(false);
  const [caseBError, setCaseBError] = useState(null);

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

  // --- Case A Handlers ---
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

  // --- Case B Handlers ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setCaseBError(null);

    if (formData.password !== formData.confirmPassword) {
      return setCaseBError("Passwords do not match.");
    }

    setCaseBSubmitting(true);
    try {
      await api.post(`/integrations/invitations/${token}/register`, {
        name: formData.name,
        password: formData.password,
      });
      // On success, move to OTP view
      setCaseBView("otp");
    } catch (err) {
      setCaseBError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setCaseBSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setCaseBError(null);
    setCaseBSubmitting(true);

    try {
      const response = await api.post(`/integrations/invitations/${token}/verify-otp`, { otp });
      const { user: newUser, examId } = response.data.data;
      const { token: jwtToken } = response.data;
      
      // Log the user in globally using AuthContext
      login(newUser, jwtToken);
      
      // Navigate to the exam
      navigate(`/exams/${examId}`);
    } catch (err) {
      setCaseBError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setCaseBSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
          <button onClick={() => navigate("/")} className="inline-block w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Already consumed handler
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
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
            
            {caseBView === "selection" && (
              <>
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
                  onClick={() => setCaseBView("register")}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200"
                >
                  Create a new account
                </button>
              </>
            )}

            {caseBView === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Creating account for</p>
                    <p className="text-sm font-semibold text-gray-900">{invitationData.email}</p>
                  </div>
                  <button type="button" onClick={() => setCaseBView("selection")} className="text-sm text-blue-600 hover:underline font-medium">Back</button>
                </div>

                {caseBError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{caseBError}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={caseBSubmitting}
                  className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {caseBSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Continue"}
                </button>
              </form>
            )}

            {caseBView === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4 text-center">
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100/50 mb-2">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Check your email</h3>
                  <p className="text-sm text-gray-600">We sent a 6-digit verification code to<br/><strong className="text-gray-900">{invitationData.email}</strong></p>
                </div>

                {caseBError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-left">{caseBError}</div>}

                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only digits
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-center text-xl tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={caseBSubmitting || otp.length !== 6}
                  className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {caseBSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Verify & Start Exam"}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setCaseBView("selection")} 
                  className="mt-4 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
