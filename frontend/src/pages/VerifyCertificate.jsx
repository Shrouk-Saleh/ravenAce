import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'

function CertificateContent({ cert, studentName }) {
  const verifyUrl = `${window.location.origin}/verify/${cert.certId}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`
  const issueDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div id="printable-certificate-area" className="bg-[#fcfbf7] border-[16px] border-[#0c1d3a] p-1.5 w-full max-w-4xl mx-auto shadow-2xl relative select-none" style={{ aspectRatio: '1.414/1' }}>
      <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet" />
      
      {/* Corner Ornaments */}
      <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-amber-600" />
      <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-amber-600" />
      <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-amber-600" />
      <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-amber-600" />
      
      {/* Inner thin gold border container */}
      <div className="border-2 border-amber-600/40 h-full w-full p-4 md:p-6 flex flex-col justify-between items-center text-center">
        
        {/* Certificate Header */}
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center gap-1.5 mb-1">
            {cert.organization?.logo ? (
              <img src={cert.organization.logo.startsWith('http') ? cert.organization.logo : `${IMAGE_BASE_URL}${cert.organization.logo}`} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            ) : (
              <img src="/logo.png" alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            )}
            <span className="font-sans text-lg md:text-2xl font-extrabold tracking-[0.25em] text-[#0c1d3a] text-center">
              {cert.exam?.certificateIssuerName 
                ? cert.exam.certificateIssuerName.toUpperCase() 
                : (cert.organization?.name ? cert.organization.name.toUpperCase() : "RAVEN ACE")}
            </span>
          </div>
          <span className="font-sans text-[10px] md:text-xs tracking-[0.25em] font-bold text-amber-700 uppercase">Certificate of Achievement</span>
          <div className="w-16 h-0.5 bg-amber-600/40 my-1.5" />
        </div>

        {/* Certificate Body */}
        <div className="flex flex-col items-center my-1">
          <span className="font-serif italic text-xs md:text-sm text-slate-500">This certifies that</span>
          <h2 className="text-2xl md:text-4xl font-bold font-serif text-[#0c1d3a] my-1.5 border-b-2 border-slate-200 pb-1 px-8 min-w-[260px] leading-tight">
            {studentName}
          </h2>
          <span className="font-serif italic text-xs md:text-sm text-slate-500 mt-1">has successfully completed the proctored exam for the certification</span>
          <h3 className="text-md md:text-xl font-sans font-bold text-[#004ac6] tracking-wide uppercase mt-1">
            {cert.exam?.title}
          </h3>
          {cert.exam?.category && (
            <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase mt-0.5">{cert.exam.category}</span>
          )}
        </div>

        {/* Certificate Footer Columns */}
        <div className="w-full grid grid-cols-3 items-center mt-2 pt-2 border-t border-slate-200/50">
          
          {/* Left Column: Signature */}
          <div className="flex flex-col items-center justify-end h-full">
            <span className="font-['Great_Vibes'] text-2xl md:text-3xl text-slate-800 leading-none">
              {cert.exam?.certificateIssuerName || cert.exam?.instructor?.name || "Benjamin"}
            </span>
            <div className="w-24 h-px bg-slate-300 my-1" />
            <span className="text-[9px] md:text-[10px] text-slate-400 font-sans uppercase tracking-wider">Authorized Signature</span>
          </div>

          {/* Center Column: Verification */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-white p-0.5 border border-slate-200 shadow-sm">
              <img src={qrUrl} alt="Verification QR" className="w-full h-full object-contain" />
            </div>
            <div className="mt-1 bg-green-50 border border-green-200 text-[#15803d] flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-sm">
              <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
              VERIFIED
            </div>
          </div>

          {/* Right Column: Raven Emblem */}
          <div className="flex flex-col items-center justify-end h-full">
            <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#0c1d3a] fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M78.5,35.2c-2.3-4.5-5.9-8.4-10.4-11c-2.7-1.5-5.7-2.6-8.8-3.1c-1.3-0.2-2.7-0.3-4-0.3c-1.1,0-2.2,0.1-3.3,0.2c-0.9,0.1-1.8,0.2-2.7,0.4c-4,0.7-7.9,2.4-11.2,4.9c-2.3,1.7-4.3,3.8-5.9,6.2c-1.7,2.5-2.9,5.3-3.6,8.2c-0.8,3.2-1.1,6.5-0.9,9.8c0.1,2.5,0.5,5,1.2,7.4l0.4,1.4l-1.3,0.6c-2.3,1.1-4.8,1.9-7.4,2.3c-1.4,0.2-2.8,0.3-4.2,0.3c-1.1,0-2.2-0.1-3.3-0.2L12,61.7l1.1,1.9c1.9,3.3,4.4,6.2,7.3,8.5c1.4,1.1,2.9,2.1,4.5,2.9c0.9,0.4,1.8,0.8,2.8,1.2c0.6,0.2,1.2,0.4,1.8,0.6l2.1,0.6c-0.2,0.9-0.3,1.8-0.5,2.7c-0.3,1.8-0.5,3.6-0.5,5.4l0,0.8l0.8-0.2c2.4-0.5,4.7-1.4,6.9-2.6c0.5-0.3,1.1-0.6,1.6-0.9c0.5-0.3,1-0.6,1.5-0.9c0.8-0.5,1.5-1,2.3-1.6c0.7-0.5,1.4-1.1,2-1.7c1.3-1.2,2.4-2.5,3.3-3.9l0.5-0.7l0.8,0.4c2.8,1.3,5.8,2.1,8.9,2.3c0.9,0.1,1.9,0.1,2.8,0.1c4-0.1,8-1.1,11.5-2.9c1.9-1,3.7-2.3,5.3-3.8c1.6-1.5,2.9-3.2,4-5.1C79,59.3,80.1,53.4,79.8,47.4C79.7,43.2,79.3,39.1,78.5,35.2z M49.8,27.8c0.7-0.7,1.7-1.1,2.7-1.2c1,0,2,0.2,2.8,0.7c0.8,0.5,1.4,1.3,1.7,2.2c0.3,0.9,0.3,2-0.1,2.9c-0.4,0.9-1.1,1.6-2,2c-0.9,0.4-1.9,0.5-2.9,0.2c-0.9-0.3-1.7-0.9-2.2-1.7c-0.5-0.8-0.7-1.8-0.5-2.8C49.3,29.3,49.5,28.5,49.8,27.8z" />
            </svg>
            <div className="w-20 h-px bg-slate-300 my-1" />
            <span className="text-[9px] md:text-[10px] text-slate-400 font-sans uppercase tracking-wider">Proctor Certified</span>
          </div>

        </div>

        {/* Certificate Meta Details */}
        <div className="w-full flex justify-between items-center text-[8px] md:text-[10px] text-slate-400 mt-1.5 font-mono">
          <span>Certificate ID: {cert.certId}</span>
          <span>Score Achieved: {cert.score}%</span>
          <span>Issue Date: {issueDate}</span>
        </div>

      </div>
    </div>
  )
}

// This page is PUBLIC — no login needed.
// Anyone with a certificate ID can verify it here.
// URL: /verify/:certId
function VerifyCertificate() {
  const { certId }      = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/certificates/verify/${certId}`)
      .then(res => setResult(res.data))
      .catch(err => {
        setResult(err.response?.data || { valid: false, message: 'Verification failed.' })
      })
      .finally(() => setLoading(false))
  }, [certId])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">

          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Raven ACE Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-h1 text-on-surface">Certificate Verification</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Raven ACE — Official Verification Portal</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
            </div>
          ) : result?.data?.valid ? (
            /* Valid certificate */
            <div className="space-y-6 text-center">
              {/* Printing media helper styles */}
              <style>{`
                @media print { 
                  @page { size: landscape; margin: 0; }
                  body { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    margin: 0; 
                    padding: 0; 
                    overflow: hidden; 
                    background-color: white;
                  }
                  body * { visibility: hidden; }
                  #print-wrapper, #print-wrapper * { visibility: visible; }
                  #print-wrapper {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: white;
                    z-index: 9999;
                    padding: 0;
                    margin: 0;
                    border: none;
                    box-shadow: none;
                  }
                  #printable-certificate-area {
                    width: 90vw;
                    max-width: 1000px;
                    height: auto;
                    aspect-ratio: 1.414 / 1;
                    box-shadow: none !important;
                  }
                }
              `}</style>

              {/* Verified header badge */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm text-left">
                <span className="material-symbols-outlined text-[#15803d] text-[36px]">verified</span>
                <div>
                  <p className="text-sm font-bold text-[#15803d]">Verification Successful</p>
                  <p className="text-[#15803d]/80 text-xs font-semibold">This is an authentic proctor-verified Raven ACE digital credential.</p>
                </div>
              </div>

              {/* The Certificate UI itself */}
              <div id="print-wrapper" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 shadow-sm overflow-x-auto">
                <CertificateContent cert={result.data.certificate} studentName={result.data.certificate.student?.name} />
              </div>

              {/* Download / Print actions */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Print / Save PDF Certificate
                </button>
              </div>
            </div>
          ) : (
            /* Invalid certificate */
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="bg-error-container px-8 py-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-error text-[40px]">gpp_bad</span>
                <div>
                  <p className="text-h3 text-on-error-container font-bold">Not Valid</p>
                  <p className="text-on-error-container/80 text-label-md">
                    {result?.message || 'This certificate could not be verified.'}
                  </p>
                </div>
              </div>
              <div className="p-8 text-center">
                <p className="text-body-md text-on-surface-variant mb-2">Certificate ID checked:</p>
                <p className="font-mono text-label-md text-on-surface bg-surface-container px-4 py-2 rounded-lg inline-block mb-6">
                  {certId}
                </p>
                <p className="text-label-md text-on-surface-variant">
                  If you believe this is an error, please contact the institution that issued this certificate.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-label-md text-primary hover:underline">
              ← Back to Raven ACE
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default VerifyCertificate
